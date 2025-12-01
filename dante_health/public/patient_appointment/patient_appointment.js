frappe.ui.form.on('Patient Appointment', {
    patient: function(frm) {
        frm.set_value('custom_patient_2', '');
        if (!frm.doc.patient) {
            frm.set_query('custom_patient_2', () => {
                return {};
            });
            return;
        }
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
                
                if (related_patients.length > 0) {
                    frm.set_query('custom_patient_2', () => {
                        return {
                            filters: [['name', 'in', related_patients]]
                        };
                    });
                } else {
                    frm.set_query('custom_patient_2', () => {
                        return {};
                    });
                }
            }
        });
    },

    appointment_type(frm) {
        if (frm.doc.appointment_type === "Couple") {
            frm.set_value("custom_is_couple", 1);
        } else {
            frm.set_value("custom_is_couple", 0);
            frm.set_value("custom_patient_2", "");
            frm.set_value("custom_patient_2_name", "");
        }
    },

    refresh: function(frm) {
        // Add multi-slot booking button for practitioner appointments
        if (frm.doc.appointment_for == 'Practitioner' && frm.is_new()) {
            // Wait a bit for the form to fully load, then replace the primary action
            setTimeout(() => {
                // Clear and set our button as primary
                frm.page.clear_primary_action();
                frm.page.set_primary_action(__('Multi-Slot Booking'), function() {
                    if (!frm.doc.patient) {
                        frappe.msgprint({
                            title: __('Patient Required'),
                            message: __('Please select a Patient first'),
                            indicator: 'red'
                        });
                        return;
                    }
                    if (!frm.doc.practitioner) {
                        frappe.msgprint({
                            title: __('Practitioner Required'),
                            message: __('Please select a Healthcare Practitioner first'),
                            indicator: 'orange'
                        });
                        return;
                    }
                    show_multi_slot_availability(frm);
                });
            }, 200);
        }
    },

    appointment_for: function(frm) {
        // Re-trigger refresh logic when appointment_for changes
        if (frm.doc.appointment_for == 'Practitioner' && frm.is_new()) {
            setTimeout(() => {
                frm.page.clear_primary_action();
                frm.page.set_primary_action(__('Multi-Slot Booking'), function() {
                    if (!frm.doc.patient) {
                        frappe.msgprint({
                            title: __('Patient Required'),
                            message: __('Please select a Patient first'),
                            indicator: 'red'
                        });
                        return;
                    }
                    if (!frm.doc.practitioner) {
                        frappe.msgprint({
                            title: __('Practitioner Required'),
                            message: __('Please select a Healthcare Practitioner first'),
                            indicator: 'orange'
                        });
                        return;
                    }
                    show_multi_slot_availability(frm);
                });
            }, 200);
        }
    },

    practitioner: function(frm) {
        // Show button when practitioner is selected
        if (frm.doc.appointment_for == 'Practitioner' && frm.is_new() && frm.doc.practitioner) {
            setTimeout(() => {
                frm.page.clear_primary_action();
                frm.page.set_primary_action(__('Multi-Slot Booking'), function() {
                    if (!frm.doc.patient) {
                        frappe.msgprint({
                            title: __('Patient Required'),
                            message: __('Please select a Patient first'),
                            indicator: 'red'
                        });
                        return;
                    }
                    show_multi_slot_availability(frm);
                });
            }, 100);
        }
    }
});

// Multi-slot availability function
function show_multi_slot_availability(frm) {
    let selected_slots = [];
    let service_unit = null;
    let add_video_conferencing = null;
    let overlap_appointments = null;
    let appointment_based_on_check_in = false;

    let d = new frappe.ui.Dialog({
        title: __('Multi-Slot Booking - Select Multiple Time Slots'),
        size: 'large',
        fields: [
            { 
                fieldtype: 'Link', 
                options: 'Medical Department', 
                reqd: 1, 
                fieldname: 'department', 
                label: 'Medical Department',
                default: frm.doc.department
            },
            { fieldtype: 'Column Break' },
            { 
                fieldtype: 'Link', 
                options: 'Healthcare Practitioner', 
                reqd: 1, 
                fieldname: 'practitioner', 
                label: 'Healthcare Practitioner',
                default: frm.doc.practitioner
            },
            { fieldtype: 'Column Break' },
            { 
                fieldtype: 'Date', 
                reqd: 1, 
                fieldname: 'appointment_date', 
                label: 'Date', 
                default: frm.doc.appointment_date || frappe.datetime.get_today(),
                min_date: new Date(frappe.datetime.get_today()) 
            },
            { fieldtype: 'Section Break' },
            { fieldtype: 'HTML', fieldname: 'selected_slots_display' },
            { fieldtype: 'Section Break' },
            { fieldtype: 'HTML', fieldname: 'available_slots' },
        ],
        primary_action_label: __('Book Selected Slots'),
        primary_action: async function() {
            if (selected_slots.length === 0) {
                frappe.msgprint({
                    title: __('No Slots Selected'),
                    message: __('Please select at least one time slot'),
                    indicator: 'orange'
                });
                return;
            }

            d.hide();
            
            frappe.show_alert({
                message: __('Validating slots and creating appointment...'),
                indicator: 'blue'
            }, 3);

            // Sort slots by time
            selected_slots.sort((a, b) => a.time.localeCompare(b.time));

            // Set first slot as appointment time
            frm.set_value('appointment_time', selected_slots[0].time);
            
            // Calculate total duration
            let first_slot_time = moment(selected_slots[0].time, 'HH:mm:ss');
            let last_slot_time = moment(selected_slots[selected_slots.length - 1].time, 'HH:mm:ss');
            let last_slot_duration = selected_slots[selected_slots.length - 1].duration;
            
            let total_duration = last_slot_time.diff(first_slot_time, 'minutes') + last_slot_duration;
            
            console.log('Multi-slot booking details:', {
                first_slot: selected_slots[0].time,
                last_slot: selected_slots[selected_slots.length - 1].time,
                last_duration: last_slot_duration,
                total_duration: total_duration,
                slots_count: selected_slots.length
            });
            
            frm.set_value('duration', total_duration);
            frm.set_value('practitioner', d.get_value('practitioner'));
            frm.set_value('department', d.get_value('department'));
            frm.set_value('appointment_date', d.get_value('appointment_date'));
            frm.set_value('appointment_based_on_check_in', appointment_based_on_check_in);

            // Store selected slots in custom field
            if (frm.fields_dict.custom_selected_slots) {
                frm.set_value('custom_selected_slots', JSON.stringify(selected_slots.map(s => ({
                    time: s.time,
                    duration: s.duration
                }))));
            }

            add_video_conferencing = add_video_conferencing && 
                                    !d.$wrapper.find(".opt-out-check").is(":checked") && 
                                    !overlap_appointments;

            frm.set_value('add_video_conferencing', add_video_conferencing);

            if (service_unit) {
                frm.set_value('service_unit', service_unit);
            }

            frappe.show_alert({
                message: __('Booking {0} slots from {1} to {2}', [
                    selected_slots.length,
                    selected_slots[0].time.substring(0, 5),
                    moment(last_slot_time).add(last_slot_duration, 'minutes').format('HH:mm')
                ]),
                indicator: 'green'
            }, 5);

            // Save with proper error handling
            frm.enable_save();
            
            try {
                await frm.save();
                
                // 1️⃣ Call your custom Python method to update the Event with correct ends_on
                frappe.call({
                    method: "dante_health.public.patient_appointment.patient_appointment.create_multi_slot_event",
                    args: {
                        appointment_name: frm.doc.name
                    },
                    callback: (r) => {
                        console.log("Event updated with correct ends_on:", r.message);
                    }
                });
                // Wait a moment for all post-save operations to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Handle payment only if needed and appointment is saved
                if (!frm.is_new()) {
                    const show_payment = await frappe.db.get_single_value("Healthcare Settings", "show_payment_popup");
                    
                    if (show_payment) {
                        frappe.call({
                            method: "healthcare.healthcare.doctype.fee_validity.fee_validity.check_fee_validity",
                            args: { "appointment": frm.doc },
                            callback: (r) => {
                                if (!r.message && !frm.doc.invoiced) {
                                    frappe.call({
                                        method: "healthcare.healthcare.doctype.patient_appointment.patient_appointment.invoice_appointment",
                                        args: { "appointment_name": frm.doc.name },
                                        callback: () => {
                                            frappe.show_alert({
                                                message: __('Appointment booked successfully!'),
                                                indicator: 'green'
                                            }, 5);
                                        }
                                    });
                                } else {
                                    frappe.show_alert({
                                        message: __('Appointment booked successfully!'),
                                        indicator: 'green'
                                    }, 5);
                                }
                            }
                        });
                    } else {
                        frappe.show_alert({
                            message: __('Appointment booked successfully!'),
                            indicator: 'green'
                        }, 5);
                    }
                }
            } catch(err) {
                console.error('Save error:', err);
                frappe.msgprint({
                    title: __('Booking Failed'),
                    message: __('Could not book appointment. The selected slots may have been booked by someone else. Please try again.'),
                    indicator: 'red'
                });
            }
        }
    });

    // Set department query
    let selected_department = frm.doc.department;
    
    d.fields_dict['department'].df.onchange = () => {
        if (selected_department != d.get_value('department')) {
            d.set_values({ 'practitioner': '' });
            selected_department = d.get_value('department');
            selected_slots = [];
            update_selected_slots_display();
        }
        if (d.get_value('department')) {
            d.fields_dict.practitioner.get_query = function() {
                return {
                    filters: { 'department': selected_department }
                };
            };
        }
    };

    d.fields_dict['appointment_date'].df.onchange = () => {
        selected_slots = [];
        update_selected_slots_display();
        show_slots();
    };
    
    d.fields_dict['practitioner'].df.onchange = () => {
        if (d.get_value('practitioner')) {
            selected_slots = [];
            update_selected_slots_display();
            show_slots();
        }
    };

    function update_selected_slots_display() {
        let $display = d.fields_dict.selected_slots_display.$wrapper;
        
        if (selected_slots.length === 0) {
            $display.html(`
                <div style="padding: 15px; background: #fff3cd; border: 2px dashed #ffc107; border-radius: 8px; text-align: center;">
                    <h5 style="margin: 0 0 5px 0; color: #856404;">
                        <i class="fa fa-hand-pointer-o"></i> ${__('How to Select Multiple Slots')}
                    </h5>
                    <p style="margin: 0; color: #856404;">
                        ${__('Click on the time slots below to select them. Click again to deselect.')}
                    </p>
                </div>
            `);
            d.get_primary_btn().attr('disabled', true);
        } else {
            let html = `<div class="selected-slots-container" style="padding: 15px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 8px; border: 2px solid #4caf50; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
            html += `<div style="margin-bottom: 12px;">
                <h5 style="margin: 0; color: #2e7d32;">
                    <i class="fa fa-check-circle"></i> ${__('Selected Time Slots')} 
                    <span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
                        ${selected_slots.length}
                    </span>
                </h5>
            </div>`;
            html += '<div style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 8px;">';
            
            // Sort for display
            let sorted_slots = [...selected_slots].sort((a, b) => a.time.localeCompare(b.time));
            
            sorted_slots.forEach((slot) => {
                let original_idx = selected_slots.findIndex(s => s.time === slot.time);
                html += `<span class="badge-slot-selected" style="background: #4caf50; color: white; padding: 10px 15px; font-size: 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3); cursor: pointer;" data-slot-index="${original_idx}">
                    <i class="fa fa-clock-o"></i>
                    <strong>${slot.time.substring(0, 5)}</strong>
                    <i class="fa fa-times-circle" style="font-size: 16px;"></i>
                </span>`;
            });
            
            html += '</div>';
            
            // Calculate and show total duration
            if (selected_slots.length >= 1) {
                let first_time = moment(sorted_slots[0].time, 'HH:mm:ss');
                let last_time = moment(sorted_slots[sorted_slots.length - 1].time, 'HH:mm:ss');
                let last_duration = sorted_slots[sorted_slots.length - 1].duration;
                let total = last_time.diff(first_time, 'minutes') + last_duration;
                let end_time = last_time.clone().add(last_duration, 'minutes');
                
                html += `<div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #81c784;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; font-size: 14px;">
                        <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                            <div style="color: #666; font-size: 11px; margin-bottom: 4px;">${__('Start Time')}</div>
                            <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">
                                <i class="fa fa-play-circle"></i> ${sorted_slots[0].time.substring(0, 5)}
                            </div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                            <div style="color: #666; font-size: 11px; margin-bottom: 4px;">${__('End Time')}</div>
                            <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">
                                <i class="fa fa-stop-circle"></i> ${end_time.format('HH:mm')}
                            </div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                            <div style="color: #666; font-size: 11px; margin-bottom: 4px;">${__('Total Duration')}</div>
                            <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">
                                <i class="fa fa-hourglass-half"></i> ${total} ${__('min')}
                            </div>
                        </div>
                    </div>
                </div>`;
            }
            
            html += '</div>';
            $display.html(html);
            
            // Add click handlers for remove buttons - entire badge is clickable
            $display.find('.badge-slot-selected').off('click').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                let idx = $(this).data('slot-index');
                let removed_slot = selected_slots[idx];
                selected_slots.splice(idx, 1);
                
                // Update button appearance in slots section
                let $slot_btn = d.$wrapper.find(`button.slot-button[data-slot-time="${removed_slot.time}"]`);
                $slot_btn.removeClass('btn-success').addClass('btn-default');
                $slot_btn.find('.fa-check').remove();
                
                update_selected_slots_display();
            });
            
            d.get_primary_btn().attr('disabled', false);
        }
    }

    function show_slots() {
        if (!d.get_value('appointment_date') || !d.get_value('practitioner')) {
            d.fields_dict.available_slots.$wrapper.html(
                `<div style="padding: 30px; text-align: center; background: #f8f9fa; border-radius: 8px;">
                    <i class="fa fa-info-circle" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <p class="text-muted" style="margin: 0; font-size: 14px;">
                        ${__('Please select Appointment Date and Healthcare Practitioner above')}
                    </p>
                </div>`
            );
            return;
        }

        frappe.call({
            method: 'healthcare.healthcare.doctype.patient_appointment.patient_appointment.get_availability_data',
            args: {
                practitioner: d.get_value('practitioner'),
                date: d.get_value('appointment_date'),
                appointment: frm.doc
            },
            callback: (r) => {
                console.log('Availability data received:', r.message);
                
                let data = r.message;
                if (!data || !data.slot_details || data.slot_details.length === 0) {
                    frappe.msgprint({
                        title: __('Not Available'),
                        message: __('Healthcare Practitioner not available on selected date'),
                        indicator: 'red'
                    });
                    return;
                }

                let $wrapper = d.fields_dict.available_slots.$wrapper;
                let slot_html = render_slots(data.slot_details, data.fee_validity, d.get_value('appointment_date'));

                $wrapper.html(slot_html);

                // Handle slot click with multi-select - IMPORTANT: Use event delegation
                $wrapper.off('click', 'button.slot-button').on('click', 'button.slot-button', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    let $btn = $(this);
                    console.log('Slot button clicked:', $btn.attr('data-slot-time'));
                    
                    if ($btn.prop('disabled')) {
                        console.log('Button is disabled');
                        return;
                    }
                    
                    let slot_time = $btn.attr('data-slot-time');
                    let slot_duration = parseInt($btn.attr('data-slot-duration'));
                    
                    service_unit = $btn.attr('data-service-unit');
                    appointment_based_on_check_in = $btn.attr('data-day-appointment') == '1';
                    add_video_conferencing = parseInt($btn.attr('data-tele-conf') || 0);
                    overlap_appointments = parseInt($btn.attr('data-overlap-appointments') || 0);

                    let existing_idx = selected_slots.findIndex(s => s.time === slot_time);
                    
                    if (existing_idx >= 0) {
                        // Deselect
                        console.log('Deselecting slot:', slot_time);
                        selected_slots.splice(existing_idx, 1);
                        $btn.removeClass('btn-success').addClass('btn-default');
                        $btn.find('.fa-check').remove();
                    } else {
                        // Select
                        console.log('Selecting slot:', slot_time);
                        selected_slots.push({
                            time: slot_time,
                            duration: slot_duration
                        });
                        $btn.removeClass('btn-default').addClass('btn-success');
                        if (!$btn.find('.fa-check').length) {
                            $btn.prepend('<i class="fa fa-check" style="margin-right: 5px;"></i>');
                        }
                    }

                    console.log('Selected slots:', selected_slots);
                    update_selected_slots_display();

                    // Video conferencing option
                    if (selected_slots.length > 0 && add_video_conferencing == 1) {
                        if (d.$wrapper.find(".opt-out-conf-div").length) {
                            d.$wrapper.find(".opt-out-conf-div").show();
                        } else {
                            let conf_html = overlap_appointments ?
                                `<div class="opt-out-conf-div ellipsis text-muted" style="padding: 5px;">
                                    <label style="margin: 0;">
                                        <span class="label-area">
                                            ${__("Video Conferencing disabled for group consultations")}
                                        </span>
                                    </label>
                                </div>` :
                                `<div class="opt-out-conf-div ellipsis" style="padding: 5px;">
                                    <label style="margin: 0;">
                                        <input type="checkbox" class="opt-out-check"/>
                                        <span class="label-area">
                                            ${__("Do not add Video Conferencing")}
                                        </span>
                                    </label>
                                </div>`;
                            d.footer.prepend(conf_html);
                        }
                    } else {
                        d.$wrapper.find(".opt-out-conf-div").hide();
                    }
                });

                // Restore selected state for previously selected slots
                selected_slots.forEach(slot => {
                    let $slot_btn = $wrapper.find(`button.slot-button[data-slot-time="${slot.time}"]`);
                    $slot_btn.removeClass('btn-default').addClass('btn-success');
                    if (!$slot_btn.find('.fa-check').length) {
                        $slot_btn.prepend('<i class="fa fa-check" style="margin-right: 5px;"></i>');
                    }
                });
            },
            freeze: true,
            freeze_message: __('Loading available time slots...')
        });
    }

    function render_slots(slot_details, fee_validity, appointment_date) {
        let html = '';

        slot_details.forEach((slot_info) => {
            html += `<div class="slot-info-section" style="margin-bottom: 30px; padding: 20px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">`;
            
            // Fee validity info
            if (fee_validity && fee_validity != 'Disabled') {
                html += `<div style="padding: 10px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; margin-bottom: 15px;">
                    <i class="fa fa-check-circle" style="color: #4caf50;"></i> 
                    <strong>${__('Fee Validity:')}</strong> Valid till <strong>${moment(fee_validity.valid_till).format('DD-MM-YYYY')}</strong>
                </div>`;
            } else if (fee_validity != 'Disabled') {
                html += `<div style="padding: 10px; background: #ffebee; border-left: 4px solid #f44336; border-radius: 4px; margin-bottom: 15px;">
                    <i class="fa fa-exclamation-circle" style="color: #f44336;"></i> 
                    <strong>${__('No fee validity found for this patient')}</strong>
                </div>`;
            }

            // Schedule info
            html += `<div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                <h5 style="margin: 0 0 10px 0; color: #333;">
                    <i class="fa fa-calendar-check-o"></i> ${slot_info.slot_name}
                    ${slot_info.tele_conf && !slot_info.allow_overlap ? 
                        '<i class="fa fa-video-camera" style="margin-left: 8px; color: #2196F3;" title="Video Conferencing Available"></i>' : ''}
                </h5>
                <div style="color: #666; font-size: 13px;">
                    <i class="fa fa-hospital-o"></i> <strong>${__('Service Unit:')}</strong> ${slot_info.service_unit}
                </div>`;
            
            if (slot_info.service_unit_capacity) {
                html += `<div style="color: #666; font-size: 13px; margin-top: 5px;">
                    <i class="fa fa-users"></i> <strong>${__('Capacity:')}</strong> ${slot_info.service_unit_capacity} ${__('patients')}
                </div>`;
            }
            
            html += `</div>`;

            // Time slots
            html += `<div class="time-slots-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 15px;">`;

            slot_info.avail_slot.forEach(slot => {
                let start_str = slot.from_time;
                let slot_start_time = moment(slot.from_time, 'HH:mm:ss');
                let slot_end_time = moment(slot.to_time, 'HH:mm:ss');
                let interval = Math.floor((slot_end_time - slot_start_time) / 60000);
                let disabled = false;
                let appointment_count = 0;
                let count_class = '';
                let count = '';

                // Check if past slot
                let now = moment();
                if (now.format("YYYY-MM-DD") == appointment_date && 
                    slot_start_time.isBefore(now) && !slot.maximum_appointments) {
                    disabled = true;
                }

                // Check overlaps
                if (!disabled) {
                    slot_info.appointments.forEach((booked) => {
                        let booked_moment = moment(booked.appointment_time, 'HH:mm:ss');
                        let end_time = booked_moment.clone().add(booked.duration, 'minutes');

                        if (slot.maximum_appointments && booked.appointment_date == appointment_date) {
                            appointment_count++;
                        }

                        if (booked_moment.isSame(slot_start_time) || 
                            booked_moment.isBetween(slot_start_time, slot_end_time)) {
                            if (booked.duration == 0) {
                                disabled = true;
                                return;
                            }
                        }

                        if (slot_info.allow_overlap != 1) {
                            if (slot_start_time.isBefore(end_time) && slot_end_time.isAfter(booked_moment)) {
                                disabled = true;
                            }
                        } else {
                            if (slot_start_time.isBefore(end_time) && slot_end_time.isAfter(booked_moment)) {
                                appointment_count++;
                            }
                            if (appointment_count >= slot_info.service_unit_capacity) {
                                disabled = true;
                            }
                        }
                    });
                }

                // Capacity badges
                if (slot.maximum_appointments) {
                    if (appointment_count >= slot.maximum_appointments) {
                        disabled = true;
                    }
                    let available = slot.maximum_appointments - appointment_count;
                    count = available > 0 ? available : __('Full');
                    count_class = available > 0 ? 'success' : 'danger';
                } else if (slot_info.allow_overlap == 1 && slot_info.service_unit_capacity > 1) {
                    let available = slot_info.service_unit_capacity - appointment_count;
                    count = available > 0 ? available : __('Full');
                    count_class = available > 0 ? 'success' : 'danger';
                }

                html += `<button class="btn btn-default slot-button" 
                    data-slot-time="${start_str}"
                    data-slot-duration="${interval}"
                    data-service-unit="${slot_info.service_unit || ''}"
                    data-tele-conf="${slot_info.tele_conf || 0}"
                    data-overlap-appointments="${slot_info.service_unit_capacity || 0}"
                    data-day-appointment="${slot.maximum_appointments ? 1 : 0}"
                    style="padding: 12px 8px; font-size: 14px; font-weight: 500; border: 2px solid #ddd; transition: all 0.2s;"
                    ${disabled ? 'disabled' : ''}>
                    ${start_str.substring(0, 5)}
                    ${count ? `<br><span class="badge badge-${count_class}" style="font-size: 10px; margin-top: 4px;">${count}</span>` : ''}
                </button>`;
            });

            html += `</div>`;

            if (slot_info.service_unit_capacity) {
                html += `<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
                    <i class="fa fa-info-circle"></i> ${__('Numbers show available capacity. Click any slot to select/deselect.')}
                </div>`;
            }

            html += `</div>`;
        });

        return html;
    }

    // Initialize
    update_selected_slots_display();
    d.show();
    
    // Auto-load slots if practitioner and date are already set
    if (d.get_value('practitioner') && d.get_value('appointment_date')) {
        setTimeout(() => show_slots(), 500);
    }
}