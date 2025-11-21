# from frappe import _

# def get_data(data=None):
#     return {
#         "fieldname": "patient",

#         "non_standard_fieldnames": {
#             # Also search by custom_patient_2
#             "Patient Appointment": "custom_patient_2"
#         },

#         "internal_link_fields": {
#             # Merge both link fields into dashboard & count
#             "Patient Appointment": ["patient", "custom_patient_2"]
#         },

#         "transactions": [
#             {
#                 "label": _("Appointments"),
#                 "items": ["Patient Appointment"]
#             }
#         ]
#     }
