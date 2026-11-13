# MTH 108 SLA class site

A live class guide for SLA sessions. Students open the site and see only the card the facilitator is on. The facilitator signs in on an iPad to control the pace and see notes and answers.

## The three screens

- Students: the plain site URL. They follow your pace, type answers, tap graphs, and build a cheat sheet that stays on their own device.
- Projector: the site URL with `#projector` on the end. It shows the same card in large type with no inputs.
- Facilitator: the plain site URL, then tap "Facilitator" at the bottom and enter the passcode. You get the timer, notes, the answer key, and controls for the card and for showing answers.

## One time setup (about 5 minutes)

1. Go to script.google.com and create a new project. Replace the code with the contents of `apps-script/Code.gs`.
2. Open Project Settings, then Script properties, and add a property named `ADMIN_PASSCODE` with the passcode you want.
3. Click Deploy, then New deployment, choose Web app. Set "Execute as" to Me and "Who has access" to Anyone. Authorize when asked.
4. Copy the Web app URL (it ends in `/exec`).
5. In this repo, edit `config.js` and paste the URL between the quotes for `API_URL`. Commit the change.
6. Open the site, sign in as the facilitator, and press Next. A second tab should follow within about 2 seconds.

If you change `Code.gs` later, use Deploy, Manage deployments, edit the deployment, and choose a new version. The URL stays the same.

## Reusing it for another week

Everything students see lives in `cards.js`. Each card has a title, the content shown on screen, your question and notes, the answer fields, and the worked answers. Field kinds are `yn`, `eq`, `num`, `text`, and `grid`.

## Things to know

- Without `API_URL` the site runs in demo mode. The passcode is `demo` and only tabs on the same device stay in sync.
- The passcode is checked by the Apps Script, not the page. Five wrong tries lock sign in for 10 minutes.
- Student answers and the cheat sheet are never sent anywhere. They live in each student's browser.
- The correct answers for the Check button are in `cards.js`, so a student who opens the page source can read them.
- Apps Script is not instant. Expect a one to three second delay between your tap and the students' screens.
