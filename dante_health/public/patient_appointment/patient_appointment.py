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
