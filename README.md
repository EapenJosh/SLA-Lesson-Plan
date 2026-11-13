# MTH 108 SLA class site

A live class guide for SLA sessions. Students open the site and see only the card the facilitator is on. The facilitator signs in on an iPad to control the pace and see notes and answers.

## The three screens

- Students: the plain site URL. They follow your pace, type answers, tap graphs, and build a cheat sheet that stays on their own device.
- Projector: the site URL with `#projector` on the end. It shows the same card in large type with no inputs.
- Facilitator: the plain site URL, then tap "Facilitator" at the bottom of the page (or on the name screen) and enter the passcode. You get the timer, notes, the answer key, a live Student work panel, and controls for the card and for showing answers.

## One time setup (about 5 minutes)

1. Go to script.google.com and create a new project. Replace the code with the contents of `apps-script/Code.gs`.
2. Open Project Settings, then Script properties, and add a property named `ADMIN_PASSCODE` with the passcode you want.
3. Click Deploy, then New deployment, choose Web app. Set "Execute as" to Me and "Who has access" to Anyone. Authorize when asked.
4. Copy the Web app URL (it ends in `/exec`).
5. In this repo, edit `config.js` and paste the URL between the quotes for `API_URL`. Commit the change.
6. Open the site, sign in as the facilitator, and press Next. A second tab should follow within about 2 seconds.

If you change `Code.gs` later, use Deploy, Manage deployments, edit the deployment, and choose a new version. The URL stays the same.

## Waiting screen and ratings

The first card is a waiting screen that says "Please wait for Josh to move the card". Students cannot see any later card, and cannot look ahead, until you tap Next. It also shows how many students have joined. Before class, tap card 1 at the top of the facilitator view if the site was used earlier, so everyone starts on the waiting screen.

Card 2 asks students to tap 0 to 5 for each target. The projector adds up the ratings with no names, showing the average, the total out of the possible points, and a small chart of how many students picked each number. The last card repeats the ratings and shows the class average before and now. Students do not see the totals on their own screens, so they are not swayed by each other.

The waiting screen only hides the cards in the page. A student who opens the page source can still read the card text.

## Student names and live work

Students enter a first name and last initial before they see anything. As they type, their answers reach the Student work panel in the facilitator view within a few seconds. Each equation, number, yes or no, and graph is checked automatically, and every field shows how many students have it right. Green dots mean a student was active in the last 45 seconds. The Show menu lets you look back at any card.

- Student work is held in the Apps Script cache only. Google erases it after 6 hours, and the Erase all student work button clears it right away. Nothing is written to a Sheet.
- Students are asked not to use their G number. The page tells them you can see their name and answers.
- A student's own device keeps its copy. If they keep typing after you erase, their work comes back.
- Anyone with the link could post a fake student. That is fine for a low stakes class, and the script caps the roster at 60.

After you change `Code.gs`, deploy a new version (Deploy, Manage deployments, edit, New version). The `/exec` URL stays the same and the old code keeps running until you do.

## Reusing it for another week

Everything students see lives in `cards.js`. Each card has a title, the content shown on screen, your question and notes, the answer fields, and the worked answers. Field kinds are `yn`, `eq`, `num`, `text`, and `grid`.

## Things to know

- Without `API_URL` the site runs in demo mode. The passcode is `demo` and only tabs on the same device stay in sync.
- The passcode is checked by the Apps Script, not the page. Five wrong tries lock sign in for 10 minutes.
- The cheat sheet and answers live on each student's device. While they are signed in with a name, a copy of their answers also goes to your Apps Script for the facilitator view.
- The correct answers for the Check button are in `cards.js`, so a student who opens the page source can read them.
- Apps Script is not instant. Expect a one to three second delay between your tap and the students' screens.
