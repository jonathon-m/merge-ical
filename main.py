import urllib.request
from icalendar import Calendar
import boto3

bucket_name = "merged-calendars"
object_name = "merged.ics"
calmb = 'https://calendar.google.com/calendar/ical/mbrinckley28%40gmail.com/private-1c315e7ab5bfdba8098e9e7e9deeb975/basic.ics'
caljm = 'https://outlook.office365.com/owa/calendar/d987c4a1b51a46bfa121f7011bad537f@anu.edu.au/04587c14d8bd416483908af0c420e8a72683683245823628643/S-1-8-1070517825-400328655-2488652977-660441538/reachcalendar.ics'
s3_client = boto3.client('s3')

def upload_text_to_s3(text):
    try:
        # Upload the text as a file to S3
        s3_client.put_object(Body=text, Bucket=bucket_name, Key=object_name)
        print(f"Text uploaded to {bucket_name}/{object_name}")
    except Exception as e:
        print(f"An error occurred: {e}")


def merge_calendars():
    ical_urls = [caljm, calmb]

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
    if 'rawPath' in event:
        ical = s3_client.get_object(Bucket=bucket_name, Key=object_name)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/calendar"
            },
            "body": ical
        }
    else:
        ical = merge_calendars()
        upload_text_to_s3(ical)

# handler("", "")


