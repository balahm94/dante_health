frappe.ui.form.on("Asset", {
	available_for_use_date(frm) {
		if (frm.doc.available_for_use_date) {
			frm.set_value("custom_warranty_date", frm.doc.available_for_use_date);
		}
	},

	custom_warranty_date(frm) {
		calculate_expiry_ui(frm);
	},

	custom_warranty_period(frm) {
		calculate_expiry_ui(frm);
	},

	refresh(frm) {
		render_warranty_info(frm);
	},
});
frappe.ui.form.on("Installed Components", {
	item_code(frm, cdt, cdn) {
		// apply filter ONLY inside child table
		frm.set_query("item_code", "custom_installed_items", function () {
			return {
				filters: {
					is_stock_item: 1,
				},
			};
		});
	},
});

function calculate_expiry_ui(frm) {
	if (frm.doc.custom_warranty_date && frm.doc.custom_warranty_period) {
		let end_date = frappe.datetime.add_months(
			frm.doc.custom_warranty_date,
			frm.doc.custom_warranty_period
		);

		frm.set_value("custom_warranty_end_date", end_date).then(() => {
			render_warranty_info(frm);
		});
	}
}

function render_warranty_info(frm) {
	let wrapper = $(frm.fields_dict["custom_warranty_info"].wrapper);

	if (!frm.doc.custom_warranty_end_date) {
		wrapper.html("");
		return;
	}

	let today = moment();
	let end = moment(frm.doc.custom_warranty_end_date);
	let diff_ms = end.diff(today);
	let duration = moment.duration(diff_ms);

	let html = "";
	if (diff_ms < 0) {
		html = `<div class="indicator-item red">
                    <span class="indicator red"></span> 
                    <b>Warranty Expired</b> (${end.fromNow()})
                </div>`;
	} else {
		let parts = [];
		if (duration.years() > 0) parts.push(`${duration.years()}y`);
		if (duration.months() > 0) parts.push(`${duration.months()}m`);
		parts.push(`${duration.days()}d`);

		html = `<div class="indicator-item green">
                    <span class="indicator green"></span> 
                    <b>Warranty Active:</b> ${parts.join(" ")} remaining
                </div>`;
	}
	wrapper.html(html);
}
