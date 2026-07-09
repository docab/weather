# weather by isomere

weather by isomere @ weather.isomere.io

Upcoming changes:
CRITICAL INSTRUCTION: Do not batch, split, or stagger this implementation. Do not write placeholder code, incomplete functions, leave requests for follow up passes or leave "TODO" comments. Process, implement, and ship the entire requested feature set fully functional in one single go.

And the sun curve now looks ugly as it’s missing its top and looks stretched. Fix it.  

Remove the 2 smart alerts limit. Show more however only display the next 2 hour and the one after that and keep all others collapsed. Add an arrow icon to extend them. Show time and remaining hours (example: 10 am to 12 pm - in 4 hours - today). Mention date/tomorrow/next day when the next card falls into the next day. Examples (for concept only): 1. Next 2 Hours - Today: Steady around 29°, cooling 2°, Rain chance stays low (0%), 4 mph, 29° feels. 2. 7 PM to 9 PM - in 5 hours - today: Heat window — peaks 45°. Water bottle, shade between 12–3, SPF a must. 3. 11 PM (today) to 1 AM (next day) - in 7 hours: Rain window — cooling 2°, Rain chances moderate (72%), heavy rain, 14 mph). 4. 2 AM to 5 AM - in 10 hours - next day: Rain stopping, etc etc. 

The background still has a dark “div” over it. AGAIN THE REAL BACKGROUND IS STILL NOT VISIBLE. There’s a layer or division or whatever you’re calling it which covers the real background. Remove it or make it transparent so that lighter text and components can be seen properly. Apparently this is what I want removed or adjusted: :root { /* --background: 220 26% 7%;. 

The text on Hero is very light when it’s “clear sky and 22 degrees” (weather conditions and temperature is for example only). Same happens with a lot of weather conditions and temperature combinations. Contents on Hero card merge with the background. The blue icons across smart alerts and location, grey text on cards can’t also be read as it merges into the background. Should the text be changed dynamically to light or dark opposing the background colour. 

The detail boxes on rain, more, going to, commute outlook, activity window cards are 100% opaque. Add transparency to them like the wear and umbrella cards. 

Give rename saved location option in Glance and Settings as well. 

The radar and map cards headers are also opaque. Please add transparency. 
