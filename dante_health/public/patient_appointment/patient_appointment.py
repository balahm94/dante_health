import frappe
from frappe import _
from frappe.model.document import Document

class PatientAppointment(Document):
    def validate(self):
        self.set_title()

    def set_title(self):
        if self.practitioner:
            # Couple appointment case
            if getattr(self, "custom_is_couple", 0) == 1 and getattr(self, "custom_patient_2", None):
                self.title = _("{0} & {1} with {2}").format(
                    self.patient_name or self.patient,
                    getattr(self, "custom_patient_2_name", None) or self.custom_patient_2,
                    self.practitioner_name or self.practitioner
                )
            else:
                # Default single patient case
                self.title = _("{0} with {1}").format(
                    self.patient_name or self.patient,
                    self.practitioner_name or self.practitioner
                )
        else:
            # No practitioner case
            self.title = _("{0} at {1}").format(
                self.patient_name or self.patient,
                self.get(frappe.scrub(self.appointment_for))
            )
