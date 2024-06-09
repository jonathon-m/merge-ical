import urllib.request
from icalendar import Calendar

def merge_calendars():
    ical_urls = ['https://outlook.office365.com/owa/calendar/d38c400092da49bda10a53db4fc8e768@anu.edu.au/08158c6b25314ac28c26a4932e5081761205026017722985754/S-1-8-2432623921-427449214-986259244-1530808760/reachcalendar.ics',
            'https://outlook.office365.com/owa/calendar/d987c4a1b51a46bfa121f7011bad537f@anu.edu.au/04587c14d8bd416483908af0c420e8a72683683245823628643/S-1-8-1070517825-400328655-2488652977-660441538/reachcalendar.ics']

    icals = [urllib.request.urlopen(url).read() for url in ical_urls]

    primary_calendar = Calendar.from_ical(icals[0])
    primary_events = {event.get("UID") for event in primary_calendar.walk('VEVENT')}

    for ical in icals[1:]:

        calendar = Calendar.from_ical(ical)

        for event in calendar.walk('VEVENT'):
            event_key = event.get("UID")
            if event_key not in primary_events:
                primary_calendar.add_component(event)

    return primary_calendar.to_ical()


def handler(event, context):
    ical = merge_calendars()

    res = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "text/calendar"
        },
        "body": ical
    }

    return res

# handler("", "")


