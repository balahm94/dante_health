app_name = "dante_health"
app_title = "Dante Health"
app_publisher = "Balamurugan"
app_description = "Health"
app_email = "balamurugan@8848digital.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "dante_health",
# 		"logo": "/assets/dante_health/logo.png",
# 		"title": "Dante Health",
# 		"route": "/dante_health",
# 		"has_permission": "dante_health.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/dante_health/css/dante_health.css"
# app_include_js = "/assets/dante_health/js/dante_health.js"

# include js, css files in header of web template
# web_include_css = "/assets/dante_health/css/dante_health.css"
# web_include_js = "/assets/dante_health/js/dante_health.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "dante_health/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
doctype_js = {
	"Patient": "public/patient/patient.js",
	"Patient Appointment": "public/patient_appointment/patient_appointment.js",
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "dante_health/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "dante_health.utils.jinja_methods",
# 	"filters": "dante_health.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "dante_health.install.before_install"
# after_install = "dante_health.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "dante_health.uninstall.before_uninstall"
# after_uninstall = "dante_health.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "dante_health.utils.before_app_install"
# after_app_install = "dante_health.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "dante_health.utils.before_app_uninstall"
# after_app_uninstall = "dante_health.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "dante_health.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }
override_doctype_class = {
    "Patient Appointment": "dante_health.public.patient_appointment.patient_appointment.PatientAppointment"
}
override_doctype_class = {
    "Patient": "dante_health.public.patient.patient.CustomPatient"
}



# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"dante_health.tasks.all"
# 	],
# 	"daily": [
# 		"dante_health.tasks.daily"
# 	],
# 	"hourly": [
# 		"dante_health.tasks.hourly"
# 	],
# 	"weekly": [
# 		"dante_health.tasks.weekly"
# 	],
# 	"monthly": [
# 		"dante_health.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "dante_health.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "dante_health.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "dante_health.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["dante_health.utils.before_request"]
# after_request = ["dante_health.utils.after_request"]

# Job Events
# ----------
# before_job = ["dante_health.utils.before_job"]
# after_job = ["dante_health.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"dante_health.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }
# override_doctype_dashboards = {
#     "Patient": "dante_health.public.patient.patient_dashboard.get_data"
# }



fixtures = [
    {
        "doctype":"Custom Field", "filters":{"module":["in",["Dante Health"]]}
    }
]