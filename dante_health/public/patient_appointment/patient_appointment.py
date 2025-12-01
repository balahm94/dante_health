import frappe
from frappe import _
from healthcare.healthcare.doctype.patient_appointment.patient_appointment import PatientAppointment as HealthcarePatientAppointment

class CustomPatientAppointment(HealthcarePatientAppointment):

    def set_title(self):
        # Couple case
        if self.practitioner:
            if getattr(self, "custom_is_couple", 0) == 1 and getattr(self, "custom_patient_2", None):
                self.title = _("{0} & {1} with {2}").format(
                    self.patient_name or self.patient,
                    self.custom_patient_2_name or self.custom_patient_2,
                    self.practitioner_name or self.practitioner
                )
            else:
                self.title = _("{0} with {1}").format(
                    self.patient_name or self.patient,
                    self.practitioner_name or self.practitioner
                )
        else:
            self.title = _("{0} at {1}").format(
                self.patient_name or self.patient,
                self.get(frappe.scrub(self.appointment_for))
            )
            

import frappe
import datetime
from frappe.utils import getdate, get_time, flt
from frappe.model.document import Document

@frappe.whitelist()
def create_multi_slot_event(appointment_name):
    """Create an Event EXACTLY like ERPNext default but with correct ends_on
       based on custom_selected_slots (multi-slot selection)."""

    doc = frappe.get_doc("Patient Appointment", appointment_name)

    # ------------------------------------
    # 1️⃣ Calculate start and correct ends_on
    # ------------------------------------

    selected = []
    try:
        selected = frappe.parse_json(doc.custom_selected_slots or "[]")
    except Exception:
        selected = []

    if not selected:
        frappe.throw("No selected slots found in the appointment.")

    # Sort by time
    selected = sorted(selected, key=lambda x: x["time"])

    start_time = selected[0]["time"]
    end_time = selected[-1]["time"]
    end_duration = selected[-1]["duration"]

    starts_on = datetime.datetime.combine(
        getdate(doc.appointment_date), get_time(start_time)
    )

    ends_on = (
        datetime.datetime.combine(getdate(doc.appointment_date), get_time(end_time))
        + datetime.timedelta(minutes=flt(end_duration))
    )

    # ------------------------------------
    # 2️⃣ Get Google Calendar
    # ------------------------------------

    google_calendar = frappe.db.get_value(
        "Healthcare Practitioner", doc.practitioner, "google_calendar"
    )
    if not google_calendar:
        google_calendar = frappe.db.get_single_value("Healthcare Settings", "default_google_calendar")

    # ------------------------------------
    # 3️⃣ Appointment Type Color
    # ------------------------------------

    if doc.appointment_type:
        color = frappe.db.get_value("Appointment Type", doc.appointment_type, "color")
    else:
        color = ""

    # ------------------------------------
    # 4️⃣ Create Event (YOUR version)
    # ------------------------------------

    event = frappe.get_doc({
        "doctype": "Event",
        "subject": f"{doc.title} - {doc.company}",
        "event_type": "Private",
        "color": color,
        "send_reminder": 1,
        "starts_on": starts_on,
        "ends_on": ends_on,   # 👈 FIXED: Correct multi-slot end time
        "status": "Open",
        "all_day": 0,
        "sync_with_google_calendar": 1 if doc.add_video_conferencing and google_calendar else 0,
        "add_video_conferencing": 1 if doc.add_video_conferencing and google_calendar else 0,
        "google_calendar": google_calendar,
        "description": f"{doc.title} - {doc.company}",
        "pulled_from_google_calendar": 0,
    })

    # ------------------------------------
    # 5️⃣ Participants
    # ------------------------------------

    participants = [
        {"reference_doctype": "Healthcare Practitioner", "reference_docname": doc.practitioner},
        {"reference_doctype": "Patient", "reference_docname": doc.patient},
    ]

    event.update({"event_participants": participants})

    # Save
    event.insert(ignore_permissions=True)
    event.reload()

    # ------------------------------------
    # 6️⃣ Save back to Appointment
    # ------------------------------------

    doc.db_set({
        "event": event.name,
        "google_meet_link": event.google_meet_link
    })

    doc.notify_update()

    return {
        "event": event.name,
        "starts_on": str(starts_on),
        "ends_on": str(ends_on),
    }
