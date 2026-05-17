from pymongo import MongoClient

# Connect to your local MongoDB server
client = MongoClient("mongodb://localhost:27017/")

# Create/Connect to a database called 'gradeops'
db = client.gradeops

# Create/Connect to a collection called 'grades'
grades_collection = db.grades

print("🟢 MongoDB Connected Successfully!")