from copy import deepcopy
from dataclasses import dataclass

import frappe
import tqdm
from erpnext.setup.utils import get_root_of
from frappe.desk.page.setup_wizard.setup_wizard import setup_complete
from frappe.utils import now_datetime

COMPANY_NAME = "The Company"
ITEM_NAME = "I-{}"
WAREHOUSE_NAME = "WH-{}"
CUSTOMER_NAME = "C-{}"
USER_NAME = "U-{}@erpc.org"


@dataclass
class Setup:
	n_items: int = 100_000
	n_warehouses: int = 10  # Note: This is only real "scaling factor" that should be used.
	users_per_warehouse: int = 10
	customers_per_warehosue: int = 30_000

	def setup_all(self):
		self.setup_company()
		self.setup_items()

	def setup_company(self):
		if frappe.db.exists("Company", COMPANY_NAME):
			frappe.throw("Company already exists, start again on a new site")

		current_year = now_datetime().year
		setup_complete(
			{
				"currency": "INR",
				"full_name": "Test User",
				"company_name": "The Company",
				"timezone": "Asia/Kolkata",
				"company_abbr": "TC",
				"industry": "Distribution",
				"country": "India",
				"fy_start_date": f"{current_year}-01-01",
				"fy_end_date": f"{current_year}-12-31",
				"language": "english",
				"company_tagline": "Testing",
				"email": "test@erpnext.com",
				"password": "test",
				"chart_of_accounts": "Standard",
			}
		)

		# just copied from ERPNext
		defaults = {
			"customer_group": get_root_of("Customer Group"),
			"territory": get_root_of("Territory"),
		}
		frappe.db.set_single_value("Selling Settings", defaults)
		for key, value in defaults.items():
			frappe.db.set_default(key, value)
		frappe.db.set_single_value("Stock Settings", "auto_insert_price_list_rate_if_missing", 0)

		frappe.db.commit()
		frappe.clear_cache()

	def setup_items(self):
		name = name_generator(ITEM_NAME, 6)
		template = frappe.new_doc("Item", is_stock_item=True, item_group=get_root_of("Item Group"))

		for _ in tqdm.tqdm(range(self.n_items)):
			item = deepcopy(template)
			item.item_code = item.name = next(name)
			item.insert()

	def setup_warehouses(self):
		name = name_generator(WAREHOUSE_NAME, 4)
		template = frappe.new_doc(
			"Warehouse",
			parent_warehouse=get_root_of("Warehouse"),
			company=COMPANY_NAME,
		)

		for _ in tqdm.tqdm(range(self.n_warehouses)):
			warehouse = deepcopy(template)
			warehouse.warehouse_name = warehouse.name = next(name)
			warehouse.insert()


def name_generator(series: str, digits):
	i = 0
	while i := i + 1:
		yield series.format(str(i).zfill(digits))
