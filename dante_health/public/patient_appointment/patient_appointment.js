frappe.ui.form.on('Patient Appointment', {
    patient: function(frm) {
        // Clear Patient 2 whenever Patient changes
        frm.set_value('custom_patient_2', '');

        if (!frm.doc.patient) {
            // No patient selected → clear filter
            frm.set_query('custom_patient_2', () => {
                return {};
            });
            return;
        }

        // Fetch selected Patient and load their relations
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Patient',
                name: frm.doc.patient
            },
            callback: function(r) {
                if (!r.message) {
                    return;
                }

                const relations = r.message.patient_relation || [];
                const related_patients = relations.map(rel => rel.patient).filter(Boolean);

                // If related patients exist → filter Patient 2 to those names
                if (related_patients.length > 0) {
                    frm.set_query('custom_patient_2', () => {
                        return {
                            filters: [['name', 'in', related_patients]]
                        };
                    });
                } 
                else {
                    // No relations → allow all patients
                    frm.set_query('custom_patient_2', () => {
                        return {};
                    });
                }
            }
        });
    }
});
