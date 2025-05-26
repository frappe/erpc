from erpnext.stock.doctype.warehouse.warehouse import Warehouse


class WarehouseOverride(Warehouse):
	def autoname(self):
		# Make it explicitly named
		self.name = self.warehouse_name
