import frappe

def create_doctypes():
    print("Connecting to Frappe...")
    
    # 1. Resident
    if not frappe.db.exists("DocType", "Resident"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Resident",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:resident_id",
            "fields": [
                {"fieldname": "full_name", "fieldtype": "Data", "label": "Name", "reqd": 1},
                {"fieldname": "resident_id", "fieldtype": "Data", "label": "Resident ID", "reqd": 1, "unique": 1},
                {"fieldname": "phone", "fieldtype": "Data", "label": "Phone"},
                {"fieldname": "email", "fieldtype": "Data", "label": "Email"},
                {"fieldname": "building_apartment", "fieldtype": "Data", "label": "Building/Apartment Number"},
                {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "Active\nInactive", "default": "Active"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        print("Resident DocType created.")

    # 2. Building
    if not frappe.db.exists("DocType", "Building"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Building",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:building_name",
            "fields": [
                {"fieldname": "building_name", "fieldtype": "Data", "label": "Building Name", "reqd": 1, "unique": 1},
                {"fieldname": "total_floors", "fieldtype": "Int", "label": "Total Floors"},
                {"fieldname": "total_apartments", "fieldtype": "Int", "label": "Total Apartments"},
                {"fieldname": "address", "fieldtype": "Small Text", "label": "Address"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        print("Building DocType created.")

    # 3. SmartEvent
    if not frappe.db.exists("DocType", "SmartEvent"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "SmartEvent",
            "module": "Smart City",
            "custom": 0,
            "autoname": "Prompt",
            "fields": [
                {"fieldname": "title", "fieldtype": "Data", "label": "Title", "reqd": 1},
                {"fieldname": "description", "fieldtype": "Text", "label": "Description"},
                {"fieldname": "date_time", "fieldtype": "Datetime", "label": "Date/Time"},
                {"fieldname": "target_audience", "fieldtype": "Data", "label": "Target Audience"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        print("SmartEvent DocType created.")

    frappe.db.commit()
    print("All core DocTypes scouted.")
