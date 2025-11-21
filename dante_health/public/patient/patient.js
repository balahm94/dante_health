frappe.ui.form.on("Patient", {
  validate(frm) {
    if (!frm.doc.custom_is_couple) return;

    const { custom_partner_name, custom_relation, custom_partner_gender, sex, first_name, name } = frm.doc;

    // Mandatory partner fields check
    if (!custom_partner_name || !custom_relation || !custom_partner_gender)
      frappe.throw("Please fill Partner Name, Relation, and Gender");

    // Skip if partner already listed in relation table
    const already_in_table = (frm.doc.patient_relation || []).some(
      r => r.patient === custom_partner_name || r.patient_name === custom_partner_name
    );
    if (already_in_table) return;

    // Check if partner already exists
    frappe.call({
      method: "frappe.client.get_value",
      args: { doctype: "Patient", filters: { first_name: custom_partner_name }, fieldname: "name" },
      callback: (res) => {
        const partner_id = res?.message?.name;
        if (partner_id) {
          link_existing(frm, partner_id);
        } else {
          create_partner(frm, {
            partner_name: custom_partner_name,
            partner_gender: custom_partner_gender,
            relation: custom_relation,
            patient_name: first_name || name,
            patient_gender: sex
          });
        }
      }
    });
  },

  // Add reverse linking after save
  after_save(frm) {
    if (!frm.doc.custom_is_couple) return;

    (frm.doc.patient_relation || []).forEach(row => {
      if (!row.patient) return;

      frappe.call({
        method: "frappe.client.get",
        args: { doctype: "Patient", name: row.patient },
        callback: ({ message: partner }) => {
          if (!partner) return;

          partner.patient_relation = partner.patient_relation || [];
          const linked_back = partner.patient_relation.some(pr => pr.patient === frm.doc.name);
          if (!linked_back) {
            partner.patient_relation.push({
              relation: row.relation,
              patient: frm.doc.name
            });
            partner.__onboarding_created_by_script = true;
            frappe.call({
              method: "frappe.client.save",
              args: { doc: partner }
            });
          }
        }
      });
    });
  }
});

// Helper: Link existing partner
function link_existing(frm, partner_id) {
  const exists = (frm.doc.patient_relation || []).some(r => r.patient === partner_id);
  if (!exists) {
    frm.add_child("patient_relation", {
      relation: frm.doc.custom_relation,
      patient: partner_id
    });
    frm.refresh_field("patient_relation");
  }
}

// Helper: Create new partner silently
function create_partner(frm, args) {
  const { partner_name, partner_gender, relation, patient_name, patient_gender } = args;

  frappe.call({
    method: "frappe.client.insert",
    args: {
      doc: {
        doctype: "Patient",
        first_name: partner_name,
        sex: partner_gender,
        custom_is_couple: 1,
        custom_partner_name: patient_name,
        custom_relation: relation,
        custom_partner_gender: patient_gender,
        __onboarding_created_by_script: true
      }
    },
    callback: ({ message }) => {
      if (message?.name) {
        frm.add_child("patient_relation", {
          relation,
          patient: message.name
        });
        frm.refresh_field("patient_relation");
      }
    }
  });
}
