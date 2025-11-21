# import frappe
# from frappe import _
# from healthcare.healthcare.doctype.patient.patient import Patient

# class CustomPatient(Patient):
#     def get_dashboard_data(self):
#         data = super().get_dashboard_data()

#         # Add appointments where this patient is in custom_patient_2
#         couple_appointments = frappe.get_all(
#             "Patient Appointment",
#             filters={"custom_patient_2": self.name}
#         )

#         if couple_appointments:
#             for section in data.get("transactions", []):
#                 if section.get("label") == "Appointments":
#                     # increment badge count
#                     if section["items"] and "badge" in section["items"][0]:
#                         section["items"][0]["badge"] += len(couple_appointments)
#                     else:
#                         section["items"][0]["badge"] = len(couple_appointments)

#         return data