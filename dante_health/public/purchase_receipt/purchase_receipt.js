frappe.ui.form.on("Purchase Receipt Item", {
	add_batch_info: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (!row.item_code) {
			frappe.msgprint(__("Please select an Item first."));
			return;
		}

		frappe.db.get_value("Item", row.item_code, ["item_name", "shelf_life_in_days"], (r) => {
			let shelf_life = r && r.shelf_life_in_days ? parseInt(r.shelf_life_in_days) : 0;
			let row_qty = parseFloat(row.qty || 0);

			// Load existing batch details or seed one row with full qty
			let batches = [];
			try {
				batches = row.custom_batch_details ? JSON.parse(row.custom_batch_details) : [];
			} catch (e) {
				batches = [];
			}
			if (batches.length === 0) {
				batches.push({
					batch_id: "",
					qty: row_qty,
					mfg_date: frappe.datetime.get_today(),
					expiry_date: shelf_life
						? frappe.datetime.add_days(frappe.datetime.get_today(), shelf_life)
						: "",
				});
			}

			let d = new frappe.ui.Dialog({
				title: __("Batch Details — {0}", [row.item_code]),
				fields: [
					{
						fieldname: "summary",
						fieldtype: "HTML",
						options: `<p class="text-muted mb-1">
							Row Qty: <strong>${row_qty} ${row.uom || ""}</strong>
							${shelf_life ? `&nbsp;·&nbsp; Shelf life: <strong>${shelf_life} days</strong>` : ""}
						</p>`,
					},
					{ fieldname: "batch_table", fieldtype: "HTML" },
					{
						fieldname: "add_row",
						fieldtype: "Button",
						label: __("+ Add Batch"),
						click() {
							sync_from_dom(d);
							// Pre-fill new row with remaining qty
							let used = batches.reduce((s, b) => s + parseFloat(b.qty || 0), 0);
							let remaining = Math.max(0, parseFloat((row_qty - used).toFixed(3)));
							batches.push({
								batch_id: "",
								qty: remaining,
								mfg_date: frappe.datetime.get_today(),
								expiry_date: shelf_life
									? frappe.datetime.add_days(frappe.datetime.get_today(), shelf_life)
									: "",
							});
							render_table(d);
						},
					},
				],
				primary_action_label: __("Confirm"),
				primary_action() {
					sync_from_dom(d);

					let errors = [];
					let total = 0;
					batches.forEach((b, i) => {
						if (!b.batch_id) errors.push(__("Row {0}: Batch ID is required", [i + 1]));
						if (!b.qty || b.qty <= 0)
							errors.push(__("Row {0}: Qty must be greater than 0", [i + 1]));
						if (!b.mfg_date)
							errors.push(__("Row {0}: Manufacturing Date is required", [i + 1]));
						if (!b.expiry_date)
							errors.push(__("Row {0}: Expiry Date is required", [i + 1]));
						total += parseFloat(b.qty || 0);
					});

					if (Math.abs(total - row_qty) > 0.001) {
						errors.push(
							__("Total batch qty ({0}) must equal row qty ({1})", [
								parseFloat(total.toFixed(3)),
								row_qty,
							])
						);
					}

					if (errors.length) {
						frappe.msgprint({
							title: __("Validation"),
							message: errors.join("<br>"),
							indicator: "red",
						});
						return;
					}

					frappe.model.set_value(cdt, cdn, "custom_batch_details", JSON.stringify(batches));
					frappe.show_alert(
						{
							message: __("{0} batch(es) saved for {1}", [
								batches.length,
								row.item_code,
							]),
							indicator: "green",
						},
						4
					);
					d.hide();
				},
			});

			function render_table(d) {
				let total = batches.reduce((s, b) => s + parseFloat(b.qty || 0), 0);
				let qty_ok = Math.abs(total - row_qty) < 0.001;
				let qty_color = qty_ok ? "#2ecc71" : "#e74c3c";
				let last_idx = batches.length - 1;

				let rows_html = batches
					.map(
						(b, i) => `
					<tr data-idx="${i}">
						<td>
							<input class="form-control form-control-sm b-id" data-idx="${i}"
								value="${frappe.utils.escape_html(b.batch_id || "")}"
								placeholder="${__("e.g. BTC-001")}"/>
						</td>
						<td>
							<input class="form-control form-control-sm b-qty" data-idx="${i}"
								type="number" step="0.001" min="0"
								value="${b.qty !== undefined && b.qty !== "" ? b.qty : ""}"/>
						</td>
						<td>
							<input class="form-control form-control-sm b-mfg" data-idx="${i}"
								type="date" value="${b.mfg_date || ""}"/>
						</td>
						<td>
							<input class="form-control form-control-sm b-exp" data-idx="${i}"
								type="date" value="${b.expiry_date || ""}"/>
						</td>
						<td style="text-align:center; vertical-align:middle;">
							${
								batches.length > 1
									? `<button class="btn btn-xs btn-danger b-remove" data-idx="${i}"
										style="padding:2px 8px; line-height:1.4;">✕</button>`
									: ""
							}
						</td>
					</tr>`
					)
					.join("");

				let html = `
					<table class="table table-bordered table-sm" style="margin-top:8px; font-size:13px;">
						<thead style="background:#f7f7f7;">
							<tr>
								<th>${__("Batch ID")}</th>
								<th style="width:90px;">${__("Qty")}</th>
								<th style="width:145px;">${__("Mfg Date")}</th>
								<th style="width:145px;">${__("Expiry Date")}</th>
								<th style="width:36px;"></th>
							</tr>
						</thead>
						<tbody>${rows_html}</tbody>
					</table>
					<div class="qty-summary" style="text-align:right; font-size:13px; font-weight:600;
						color:${qty_color}; margin-top:4px;">
						${__("Batched")}: ${parseFloat(total.toFixed(3))} / ${row_qty} ${row.uom || ""}
						${qty_ok ? " ✓" : " — qty mismatch"}
					</div>`;

				let $w = d.fields_dict.batch_table.$wrapper;
				$w.html(html);

				// Auto-calc expiry when mfg date changes
				$w.find(".b-mfg").on("change", function () {
					if (!shelf_life) return;
					let idx = $(this).data("idx");
					let mfg = $(this).val();
					if (mfg) {
						$w.find(`.b-exp[data-idx="${idx}"]`).val(
							frappe.datetime.add_days(mfg, shelf_life)
						);
					}
				});

				// When a non-last row qty changes → auto-fill last row with remaining
				$w.find(".b-qty").on("input", function () {
					let changed_idx = parseInt($(this).data("idx"));
					let is_last = changed_idx === last_idx;

					// Sync just the changed row
					batches[changed_idx].qty = parseFloat($(this).val()) || 0;

					if (!is_last) {
						// Recalculate last row as remainder
						let sum_except_last = batches
							.slice(0, last_idx)
							.reduce((s, b) => s + parseFloat(b.qty || 0), 0);
						let remaining = parseFloat(
							Math.max(0, row_qty - sum_except_last).toFixed(3)
						);
						batches[last_idx].qty = remaining;
						$w.find(`.b-qty[data-idx="${last_idx}"]`).val(remaining);
					}

					// Refresh summary
					let new_total = batches.reduce((s, b) => s + parseFloat(b.qty || 0), 0);
					let ok = Math.abs(new_total - row_qty) < 0.001;
					$w.find(".qty-summary")
						.css("color", ok ? "#2ecc71" : "#e74c3c")
						.text(
							`${__("Batched")}: ${parseFloat(new_total.toFixed(3))} / ${row_qty} ${row.uom || ""}${ok ? " ✓" : " — qty mismatch"}`
						);
				});

				// Remove row
				$w.find(".b-remove").on("click", function () {
					sync_from_dom(d);
					batches.splice(parseInt($(this).data("idx")), 1);
					render_table(d);
				});
			}

			function sync_from_dom(d) {
				d.fields_dict.batch_table.$wrapper.find("tbody tr").each(function () {
					let idx = parseInt($(this).data("idx"));
					if (batches[idx] !== undefined) {
						batches[idx].batch_id = $(this).find(".b-id").val();
						batches[idx].qty = parseFloat($(this).find(".b-qty").val()) || 0;
						batches[idx].mfg_date = $(this).find(".b-mfg").val();
						batches[idx].expiry_date = $(this).find(".b-exp").val();
					}
				});
			}

			d.show();
			render_table(d);
		});
	},
});
