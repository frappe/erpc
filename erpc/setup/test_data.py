import frappe
from erpnext.setup.utils import get_root_of
from frappe.desk.page.setup_wizard.setup_wizard import setup_complete
from frappe.utils import now_datetime

COMPANY_NAME = "The Company"


def setup_company():
	if frappe.db.exists("Company", COMPANY_NAME):
		frappe.throw("Company already exists, start again on a new site")

	current_year = now_datetime().year
	setup_complete(
		{
			"currency": "USD",
			"full_name": "Test User",
			"company_name": "The Company",
			"timezone": "Asia/Kolkata",
			"company_abbr": "TC",
			"industry": "Distribution",
			"country": "India",
			"fy_start_date": f"{current_year}-04-01",
			"fy_end_date": f"{current_year + 1}-03-31",
			"language": "english",
			"company_tagline": "Testing",
			"email": "test@erpnext.com",
			"password": "test",
			"chart_of_accounts": "Standard",
		}
	)

	set_defaults_for_tests()
	frappe.db.commit()
	frappe.clear_cache()


def set_defaults_for_tests():  # just copied from ERPNext, no idea if required or not
	defaults = {
		"customer_group": get_root_of("Customer Group"),
		"territory": get_root_of("Territory"),
	}
	frappe.db.set_single_value("Selling Settings", defaults)
	for key, value in defaults.items():
		frappe.db.set_default(key, value)
	frappe.db.set_single_value("Stock Settings", "auto_insert_price_list_rate_if_missing", 0)
