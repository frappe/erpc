app_name = "erpc"
app_title = "ERP-C"
app_publisher = "Frappe"
app_description = "TPC-C inspired benchmark for ERPNext"
app_email = "developers@frappe.io"
app_license = "agpl-3.0"


override_doctype_class = {"Warehouse": "erpc.overrides.warehouse.WarehouseOverride"}
