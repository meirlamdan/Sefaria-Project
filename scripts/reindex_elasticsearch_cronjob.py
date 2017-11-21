from datetime import datetime
import requests
import os
from sefaria.model import *
from sefaria.search import index_all
from sefaria.local_settings import SEFARIA_BOT_API_KEY
from sefaria.pagesheetrank import calculate_pagerank, calculate_sheetrank

last_dump = datetime.fromtimestamp(os.path.getmtime("/var/data/sefaria_public/dump/sefaria")).isoformat()
calculate_pagerank()
calculate_sheetrank()
index_all(merged=False)
r = requests.post("https://www.sefaria.org/admin/index-sheets-by-timestamp", data={"timestamp": last_dump, "apikey": SEFARIA_BOT_API_KEY})
if "error" in r.text:
    raise Exception("Error when calling admin/index-sheets-by-timestamp API: " + r.text)
else:
    print "SUCCESS!", r.text
