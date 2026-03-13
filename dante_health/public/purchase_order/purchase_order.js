frappe.ui.form.on("Purchase Order", {
    onload: function (frm) {
        if (frm.is_new() && frm.doc.items && frm.doc.items.length > 0) {
            frm.trigger("set_cost_center_from_mr");
        }
    },

    set_cost_center_from_mr: function (frm) {
        // Find the first item that has a material_request reference
        let mr_name = null;
        for (let item of (frm.doc.items || [])) {
            if (item.material_request) {
                mr_name = item.material_request;
                break;
            }
        }

        if (mr_name && !frm.doc.cost_center) {
            frappe.db.get_value("Material Request", mr_name, "default_cost_center", (r) => {
                if (r && r.default_cost_center) {
                    frm.set_value("cost_center", r.default_cost_center);
                }
            });
        }
    },
    refresh: function(frm) {
        frm.set_query("item_code", "items", function() {
            return {
                query: "dante_health.common_api.item_query_with_last_grn"
            };
        });
    },
});
