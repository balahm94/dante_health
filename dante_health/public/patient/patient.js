frappe.ui.form.on("Patient", {
    custom_add_relation(frm) {
        open_relation_dialog(frm);
    }
});


function open_relation_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: "Add Partner / Relation",
        fields: [
            {
                fieldname: "is_existing",
                label: "Is Existing Patient?",
                fieldtype: "Check",
                default: 0,
                onchange() {
                    d.refresh();
                }
            },
            {
                fieldname: "is_new_patient",
                label: "Is New Patient",
                fieldtype: "Check",
                default: 0,
                onchange() {
                    d.refresh();
                }
            },
            {
                fieldname: "existing_patient",
                label: "Select Existing Patient",
                fieldtype: "Link",
                options: "Patient",
                depends_on: "eval:doc.is_existing == 1",
                reqd: 1,
                get_query() {
                    return {
                        query: "dante_health.public.patient.patient.search_patient"
                    };
                }
            },
            {
                fieldname: "partner_name",
                label: "Partner Name",
                fieldtype: "Data",
                depends_on: "eval:doc.is_existing != 1 && doc.is_new_patient == 1",
                reqd: 1,
            },
            {
                fieldname: "partner_gender",
                label: "Partner Gender",
                fieldtype: "Link",
                options: "Gender",
                depends_on: "eval:doc.is_existing != 1 && doc.is_new_patient == 1",
                reqd: 1,
            },
            {
                fieldname: "relation",
                label: "Relation",
                fieldtype: "Select",
                options: "Father\nMother\nSpouse\nSiblings\nFamily\nOther",
                reqd: 1,
                depends_on: "eval:doc.is_existing == 1 || doc.is_new_patient == 1"
            }
        ],

        primary_action_label: "Submit",

        async primary_action(values) {
            if (!values.is_existing) {
                if (!values.partner_name || !values.partner_gender) {
                    frappe.msgprint({
                        title: "Missing Values Required",
                        message: "Please fill Partner Name and Partner Gender",
                        indicator: "red"
                    });
                    return;
                }
            }

            d.hide();

            if (frm.is_new()) {
                await frm.save();
            }

            frappe.call({
                method: "dante_health.public.patient.patient.create_couple_relation",
                args: {
                    patient_1: frm.doc.name,
                    use_existing: values.is_existing,
                    existing_patient: values.existing_patient,
                    partner_name: values.partner_name,
                    partner_gender: values.partner_gender,
                    relation: values.relation
                },
                freeze: true,
                freeze_message: "Updating partner relation...",
                callback() {
                    frm.reload_doc();
                }
            });
        }
    });

    d.show();
}









// Field Level Customisations


// frappe.ui.form.on("Patient", {
//   validate(frm) {
//     if (!frm.doc.custom_is_couple) return;

//     const { custom_partner_name, custom_relation, custom_partner_gender, sex, first_name, name } = frm.doc;

//     if (!custom_partner_name || !custom_relation || !custom_partner_gender)
//       frappe.throw("Please fill Partner Name, Relation, and Gender");

//     const already_in_table = (frm.doc.patient_relation || []).some(
//       r => r.patient === custom_partner_name || r.patient_name === custom_partner_name
//     );
//     if (already_in_table) return;

//     frappe.call({
//       method: "frappe.client.get_value",
//       args: { doctype: "Patient", filters: { first_name: custom_partner_name }, fieldname: "name" },
//       callback: (res) => {
//         const partner_id = res?.message?.name;
//         if (partner_id) {
//           link_existing(frm, partner_id);
//         } else {
//           create_partner(frm, {
//             partner_name: custom_partner_name,
//             partner_gender: custom_partner_gender,
//             relation: custom_relation,
//             patient_name: first_name || name,
//             patient_gender: sex
//           });
//         }
//       }
//     });
//   },

//   after_save(frm) {
//     if (!frm.doc.custom_is_couple) return;

//     (frm.doc.patient_relation || []).forEach(row => {
//       if (!row.patient) return;

//       frappe.call({
//         method: "frappe.client.get",
//         args: { doctype: "Patient", name: row.patient },
//         callback: ({ message: partner }) => {
//           if (!partner) return;

//           partner.patient_relation = partner.patient_relation || [];
//           const linked_back = partner.patient_relation.some(pr => pr.patient === frm.doc.name);
//           if (!linked_back) {
//             partner.patient_relation.push({
//               relation: row.relation,
//               patient: frm.doc.name
//             });
//             partner.__onboarding_created_by_script = true;
//             frappe.call({
//               method: "frappe.client.save",
//               args: { doc: partner }
//             });
//           }
//         }
//       });
//     });
//   }
// });

// function link_existing(frm, partner_id) {
//   const exists = (frm.doc.patient_relation || []).some(r => r.patient === partner_id);
//   if (!exists) {
//     frm.add_child("patient_relation", {
//       relation: frm.doc.custom_relation,
//       patient: partner_id
//     });
//     frm.refresh_field("patient_relation");
//   }
// }

// function create_partner(frm, args) {
//   const { partner_name, partner_gender, relation, patient_name, patient_gender } = args;

//   frappe.call({
//     method: "frappe.client.insert",
//     args: {
//       doc: {
//         doctype: "Patient",
//         first_name: partner_name,
//         sex: partner_gender,
//         custom_is_couple: 1,
//         custom_partner_name: patient_name,
//         custom_relation: relation,
//         custom_partner_gender: patient_gender,
//         __onboarding_created_by_script: true
//       }
//     },
//     callback: ({ message }) => {
//       if (message?.name) {
//         frm.add_child("patient_relation", {
//           relation,
//           patient: message.name
//         });
//         frm.refresh_field("patient_relation");
//       }
//     }
//   });
// }
