/* Card content. Edit this file to reuse the site for another week.
   Field kinds: yn (yes/no), eq (equation, checked by slope and y-intercept), num (number), text (free writing), grid (tap points on a graph). */
(function () {
  function tbl(xs, ys, label) {
    var h = '<div class="tbl-wrap">' + (label ? '<span class="k">' + label + '</span>' : '') + '<div class="wrap-x"><table class="xy"><tr><th>x</th>';
    xs.forEach(function (v) { h += '<td>' + v + '</td>'; });
    h += '</tr><tr><th>y</th>';
    ys.forEach(function (v) { h += '<td>' + v + '</td>'; });
    return h + '</tr></table></div></div>';
  }
  function graph(label, m, b, marks) {
    return '<figure class="graph" data-m="' + m + '" data-b="' + b + '" data-marks="' + marks + '" data-label="Graph ' + label + '"><figcaption>' + label + '</figcaption></figure>';
  }
  function ul(items) { return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }
  function ans(html) { return html; }

  function yn(id, label, v) { return { k: 'yn', id: id, label: label, v: v }; }
  function eq(id, label, m, b, ph) { return { k: 'eq', id: id, label: label, m: m, b: b, ph: ph || 'y = ...' }; }
  function num(id, label, v) { return { k: 'num', id: id, label: label, v: v, ph: 'Type a number' }; }
  function txt(id, label, rows) { return { k: 'text', id: id, label: label, rows: rows || 2 }; }
  function rate(id, label) { return { k: 'rate', id: id, label: label, max: 5 }; }
  function grd(id, label, m, b, need) { return { k: 'grid', id: id, label: label, m: m, b: b, need: need || 3 }; }

  window.BLOCKS = [
    { name: 'Open', min: 5, c: 'var(--c-open)' },
    { name: 'L1 Tables', min: 12, c: 'var(--c-l1)' },
    { name: 'L2 Graphs', min: 13, c: 'var(--c-l2)' },
    { name: 'L3 Applications', min: 14, c: 'var(--c-l3)' },
    { name: 'Wrap up', min: 6, c: 'var(--c-wrap)' }
  ];

  window.CARDS = [
    { blk: 0, t: [0, 0], wait: true, joined: true, title: 'Please wait for Josh to move the card',
      body: '<p class="lead">Keep this page open. Your screen changes on its own when class starts.</p><div id="rateBox" class="ratebox"></div>',
      ask: 'Welcome students as they arrive. Tap Next when you are ready to start.',
      notes: ul(['Students cannot see any other card until you tap Next. Looking back is only possible for cards you have already shown.', 'Use this time for attendance and to make sure everyone has entered a name. The count shows how many have joined.', 'If the page was used before, tap card 1 at the top to bring students back to this screen.']),
      work: null, ans: null },

    { blk: 0, t: [0, 2], title: 'Rate your confidence, 0 to 5',
      body: '<p class="lead">On your device, tap a number from 0 to 5 for how confident you are on each target.</p>' +
        '<ol class="big-list"><li><b>L1</b> Is a table linear? If it is, find the equation.</li><li><b>L2</b> Graph a line, and write an equation from a graph.</li><li><b>L3</b> Write an equation for a story, explain m and b, and answer a question.</li></ol><div id="rateBox" class="ratebox"></div>',
      ask: 'Read each target aloud, then ask students to tap a number from 0 to 5 for each one.',
      notes: ul(['The projector adds up the ratings as students tap, with no names. Your panel below shows who rated what.', 'The lowest average is the target to protect if time runs short.', 'Remind them: no retakes Monday, just these three targets.']),
      rates: [{ label: 'L1 Tables', pre: 'rate-pre-L1' }, { label: 'L2 Graphs', pre: 'rate-pre-L2' }, { label: 'L3 Applications', pre: 'rate-pre-L3' }], rateShow: 'pre',
      work: [{ t: 'How confident are you right now? 0 is not at all, 5 is completely.', f: [rate('rate-pre-L1', 'L1 Tables'), rate('rate-pre-L2', 'L2 Graphs'), rate('rate-pre-L3', 'L3 Applications')] }],
      ans: null },

    { blk: 0, t: [2, 5], title: 'What do m and b mean?',
      body: '<div class="formula">y = mx + b</div><p class="lead">Talk with the person next to you, then write it in your own words.</p>',
      ask: 'What does m tell you about a line? What does b tell you? Say it so a friend who missed class would get it.',
      notes: ul(['Give pairs a few seconds to talk before anyone answers.', 'Take two students. Accept any correct wording, since they will use their own words on the cheat sheet.']),
      work: [{ t: '', f: [txt('c1-m', 'm tells me...', 2), txt('c1-b', 'b tells me...', 2)] }],
      ans: ans('<p>m is the slope. It tells how steep the line is and which way it tilts: how much y changes for each 1 step in x.</p><p>b is the y-intercept. It is where the line crosses the y-axis, so it is the value of y when x is 0.</p>') },

    { blk: 1, t: [5, 8], title: 'Which table is linear?',
      body: '<div class="tables">' + tbl([0, 1, 2, 3, 4], [5, 9, 13, 17, 21], 'Table A') + tbl([1, 2, 3, 4], [3, 6, 12, 24], 'Table B') + '</div><p class="lead">Decide with your partner. How do you know?</p>',
      ask: 'What happens to y each time x goes up by 1? Is that the same every time?',
      notes: ul(['Do not say what to look for. Let them find it.', 'Listen for "it goes up by 4 every time" and "it doubles".']),
      work: [
        { t: 'Table A', f: [yn('c2-A-yn', 'Is Table A linear?', true), eq('c2-A-eq', 'If yes, its equation', 4, 5, 'y = ...')] },
        { t: 'Table B', f: [yn('c2-B-yn', 'Is Table B linear?', false)] }
      ],
      ans: ans('<p>Table A is linear. y goes up 4 every time x goes up 1, so m = 4. The table has x = 0, so b = 5. Equation: y = 4x + 5.</p><p>Table B is not linear. y changes by 3, then 6, then 12, so the rate is not constant. The y values double.</p>') },

    { blk: 1, t: [8, 10], title: 'Write the test for your cheat sheet',
      body: '<p class="lead">In your own words, how can you tell if a table is linear?</p><p class="small">Then write how you find the equation once you know it is.</p>',
      ask: 'What would you check first on a brand new table?',
      notes: ul(['Collect two student versions out loud.', 'Land on: change in y divided by change in x is the same for every pair of rows.']),
      work: [{ t: '', f: [txt('cheat-L1', 'Cheat sheet panel L1', 5)] }],
      ans: ans('<p>A table is linear when the change in y divided by the change in x is the same for every pair of rows.</p><p class="eqline">m = (y₂ − y₁) ÷ (x₂ − x₁)</p><p>Then find b: if x = 0 is in the table, that y is b. If not, plug one point into y = mx + b and solve.</p>') },

    { blk: 1, t: [10, 17], title: 'Pairs practice: C, D, E',
      body: '<div class="tables">' + tbl([2, 4, 6, 8], [7, 13, 19, 25], 'C') + tbl([1, 3, 4, 8], [2, 8, 11, 23], 'D · x spacing is uneven') + tbl([0, 5, 10, 15], [20, 17, 14, 11], 'E') + '</div><p class="small">Take turns. One person types and one talks it through, then switch every problem.</p>',
      ask: 'Where did you get b from? What would you do if x never equals 0 in the table?',
      notes: ul(['Walk the room and ask questions instead of fixing work.', 'If you are behind, cut D.', 'Watch for flipped fractions, and for the first y value used as b when x = 0 is missing.']),
      work: [
        { t: 'Table C', f: [eq('c4-C', 'Equation', 3, 1)] },
        { t: 'Table D', f: [eq('c4-D', 'Equation', 3, -1)] },
        { t: 'Table E', f: [eq('c4-E', 'Equation', -0.6, 20)] }
      ],
      ans: ans('<p><b>C</b> Linear. x up 2, y up 6, so m = 3. 7 = 3(2) + b gives b = 1. y = 3x + 1.</p><p><b>D</b> Linear. Rates: 6 ÷ 2 = 3, 3 ÷ 1 = 3, 12 ÷ 4 = 3. 2 = 3(1) + b gives b = −1. y = 3x − 1.</p><p><b>E</b> Linear. y drops 3 as x goes up 5, so m = −3/5. x = 0 is there, so b = 20. y = −3/5 x + 20.</p>') },

    { blk: 2, t: [17, 22], title: 'Graph it, swap it',
      body: '<div class="items"><div class="item"><span class="k">P1</span><span class="eq">y = 2x − 3</span></div><div class="item"><span class="k">P2</span><span class="eq">y = −1/2 x + 4</span></div><div class="item"><span class="k">P3 · stretch</span><span class="eq">y = 2/3 x − 1</span></div></div><p class="small">Tap the grid to plot points. Plot at least 3, starting at the y-intercept. Then show your screen to your partner.</p>',
      ask: 'Where is your first point, and why there? What is your move to get to the next point?',
      notes: ul(['The check question: does the line cross the y-axis at b, and does the next point follow the slope?', 'Skip P3 if you are behind.', 'Watch for students starting the slope move at the origin instead of at b.']),
      work: [
        { t: 'P1: y = 2x − 3', f: [grd('c5-P1', 'Plot your points', 2, -3, 3)] },
        { t: 'P2: y = −1/2 x + 4', f: [grd('c5-P2', 'Plot your points', -0.5, 4, 3)] },
        { t: 'P3 (stretch): y = 2/3 x − 1', f: [grd('c5-P3', 'Plot your points', 2 / 3, -1, 3)] },
        { t: 'Cheat sheet', f: [txt('cheat-L2', 'Panel L2: my steps to graph a line', 4)] }
      ],
      ans: ans('<p><b>P1</b> Start (0, −3), up 2 right 1: (1, −1), (2, 1), (3, 3).</p><p><b>P2</b> Start (0, 4), down 1 right 2: (2, 3), (4, 2), (6, 1).</p><p><b>P3</b> Start (0, −1), up 2 right 3: (3, 1), (6, 3).</p>') },

    { blk: 2, t: [22, 30], title: 'Reverse engineer: write the equation',
      body: '<div class="graphs">' + graph('G1', 2, 1, '0,1;2,5') + graph('G2', -1, -2, '0,-2;-2,0;1,-3') + graph('G3', -0.75, 3, '0,3;4,0;-4,6') + '</div><p class="small">Pick two points on grid crossings. Find the slope, read b, write the equation.</p>',
      ask: 'How do you know the slope is negative just by looking? Which point would you use to double check?',
      notes: ul(['Students compare with their partner before you reveal anything.', 'Watch for dropped negative signs and slope counted from points that are not on grid crossings.']),
      work: [
        { t: 'G1', f: [eq('c6-G1', 'Equation', 2, 1)] },
        { t: 'G2', f: [eq('c6-G2', 'Equation', -1, -2)] },
        { t: 'G3', f: [eq('c6-G3', 'Equation', -0.75, 3)] },
        { t: 'Cheat sheet', f: [txt('cheat-L2', 'Panel L2: my steps to write an equation from a graph', 4)] }
      ],
      ans: ans('<p><b>G1</b> b = 1. From (0, 1) to (2, 5): up 4, right 2, so m = 2. y = 2x + 1.</p><p><b>G2</b> b = −2. From (0, −2) to (−2, 0): up 2, left 2, so m = −1. y = −x − 2.</p><p><b>G3</b> b = 3. From (0, 3) to (4, 0): down 3, right 4, so m = −3/4. y = −3/4 x + 3.</p>') },

    { blk: 3, t: [30, 34], title: 'Model one together',
      body: '<p class="story">A gym charges a <span class="hl-b">one time sign up fee of $25</span> and <span class="hl-m">$15 per month</span>. Write the equation for the total cost C after m months, say what the slope and y-intercept mean, and find the cost after 8 months.</p>' +
        '<div class="legend"><span><span class="hl-b">Start value</span> is b</span><span><span class="hl-m">Rate, the "per"</span> is m</span></div>' +
        '<div class="frames">For every extra ___ , the ___ goes up (down) by ___ .<br>When ___ is 0, the ___ is ___ .</div>',
      ask: 'Which number is there before any months go by? Which number shows up again and again for every month?',
      notes: ul(['Ask students to tell you what to say at each step, so they do the thinking.', 'Use the two highlight colors on the screen as the model: start value and rate.', 'Have them copy the sentence frames to cheat sheet panel L3.']),
      work: [{ t: 'Gym problem', f: [eq('c7-eq', 'Equation for C', 15, 25, 'C = ...'), txt('c7-m', 'What the slope means (with units)', 2), txt('c7-b', 'What the y-intercept means', 2), num('c7-n', 'Cost after 8 months, in dollars', 145)] },
        { t: 'Cheat sheet', f: [txt('cheat-L3', 'Panel L3: my steps for applications', 4)] }],
      ans: ans('<p>C = 15m + 25.</p><p>Slope 15: the cost goes up $15 for every extra month.</p><p>Y-intercept 25: the cost is $25 at 0 months, the sign up fee.</p><p>After 8 months: 15(8) + 25 = $145.</p>') },

    { blk: 3, t: [34, 40], title: 'Pairs: equation, two sentences, answer',
      body: '<div class="items"><div class="item"><span class="k">Problem 2</span><p class="story sm">A water tank holds 120 gallons and drains at 4 gallons per minute. Write the equation for the gallons G left after t minutes, explain the slope and y-intercept, and find when the tank is empty.</p></div>' +
        '<div class="item"><span class="k">Problem 3</span><p class="story sm">A plant is 6 cm tall when first measured and grows 1.5 cm each week. Write the equation for the height h after w weeks, explain the slope and y-intercept, and find the height after 10 weeks.</p></div>' +
        '<div class="item"><span class="k">Challenge · two data points</span><p class="story sm">A candle is 12 inches tall after 1 hour and 9 inches tall after 3 hours. Write the equation for the height h after t hours, explain the slope and y-intercept, and find the height after 5 hours.</p></div></div>',
      ask: 'Is your slope sentence missing units? Is the question giving you x or y?',
      notes: ul(['Pairs take Problem 2 and 3. Fast pairs add the challenge.', 'Watch for m and b swapped, and for plugging the answer in as x when the question gives y.']),
      work: [
        { t: 'Problem 2: water tank', f: [eq('c8-2eq', 'Equation for G', -4, 120, 'G = ...'), txt('c8-2m', 'What the slope means (with units)', 2), txt('c8-2b', 'What the y-intercept means', 2), num('c8-2n', 'Minutes until the tank is empty', 30)] },
        { t: 'Problem 3: plant', f: [eq('c8-3eq', 'Equation for h', 1.5, 6, 'h = ...'), txt('c8-3m', 'What the slope means (with units)', 2), txt('c8-3b', 'What the y-intercept means', 2), num('c8-3n', 'Height after 10 weeks, in cm', 21)] },
        { t: 'Challenge: candle', f: [eq('c8-4eq', 'Equation for h', -1.5, 13.5, 'h = ...'), num('c8-4n', 'Height after 5 hours, in inches', 6)] }
      ],
      ans: ans('<p><b>2</b> G = −4t + 120. Slope −4: loses 4 gallons per extra minute. Y-intercept 120: holds 120 gallons at 0 minutes. Empty when −4t + 120 = 0, so t = 30 minutes.</p><p><b>3</b> h = 1.5w + 6. Slope 1.5: grows 1.5 cm per extra week. Y-intercept 6: 6 cm at 0 weeks. After 10 weeks: 21 cm.</p><p><b>Challenge</b> m = (9 − 12) ÷ (3 − 1) = −1.5. 12 = −1.5(1) + b gives b = 13.5. h = −1.5t + 13.5. After 5 hours: 6 inches.</p>') },

    { blk: 3, t: [40, 44], title: 'Check each other',
      body: '<p class="lead">Swap screens with the pair next to you.</p><ol class="big-list"><li>Check their equation.</li><li>Check that their slope sentence has units.</li><li>Check their y-intercept sentence and final answer.</li><li>Tell them one thing that is right and one question you have.</li></ol><p class="small">Then take your screen back and fix anything that came up.</p>',
      ask: 'What did you see on the other pair\'s screen that you want to copy onto your cheat sheet?',
      notes: ul(['Spend your last minute on the one mistake you saw most.', 'If you are behind, skip the swap and have each pair read their sentences aloud.']),
      work: [{ t: '', f: [txt('c9-add', 'One thing I want to add to my cheat sheet', 3)] }],
      ans: null },

    { blk: 4, t: [44, 48], title: 'Exit ticket',
      body: '<p class="small">Work alone. You may use your cheat sheet.</p><div class="items">' +
        '<div class="item"><span class="k">L1</span>' + tbl([0, 1, 2, 3], [10, 7, 4, 1]) + '<p>Is this table linear? If so, write the equation.</p></div>' +
        '<div class="item"><span class="k">L2</span><p>Graph <span class="eq sm">y = −2x + 1</span></p></div>' +
        '<div class="item"><span class="k">L3</span><p>A streaming service charges a one time setup fee of $12 and $8 per month. Write the equation for the cost C after m months, explain the slope and y-intercept, and find the cost after 6 months.</p></div></div>',
      ask: 'Skim the Check results as students finish to see which target needs work.',
      notes: ul(['If you are short on time, give only the L3 problem, since it uses the most skills.']),
      work: [
        { t: 'L1', f: [yn('c10-1yn', 'Is it linear?', true), eq('c10-1eq', 'Equation', -3, 10)] },
        { t: 'L2: y = −2x + 1', f: [grd('c10-2', 'Plot your points', -2, 1, 3)] },
        { t: 'L3', f: [eq('c10-3eq', 'Equation for C', 8, 12, 'C = ...'), txt('c10-3m', 'What the slope means (with units)', 2), txt('c10-3b', 'What the y-intercept means', 2), num('c10-3n', 'Cost after 6 months, in dollars', 60)] }
      ],
      ans: ans('<p><b>L1</b> Linear. y drops 3 as x goes up 1, so m = −3, b = 10. y = −3x + 10.</p><p><b>L2</b> Start (0, 1), down 2 right 1: (1, −1), (2, −3).</p><p><b>L3</b> C = 8m + 12. Slope 8: cost goes up $8 per extra month. Y-intercept 12: the $12 setup fee at 0 months. After 6 months: $60.</p>') },

    { blk: 4, t: [48, 50], title: 'Re-rate and close',
      body: '<p class="lead">Rate yourself again. Compare with where you started.</p><ol class="big-list"><li>Which target moved the least? Redo that one first on your own.</li><li>Monday: no retakes, just L1, L2, and L3.</li><li>Your cheat sheet stays on this device. Use Copy all to save it somewhere.</li></ol><div id="rateBox" class="ratebox"></div>',
      ask: 'Which target moved the least? That is the one to redo first on your own.',
      notes: ul(['The projector shows the class average before and now for each target.', 'Say the Monday plan out loud one more time.']),
      rates: [{ label: 'L1 Tables', pre: 'rate-pre-L1', post: 'rate-post-L1' }, { label: 'L2 Graphs', pre: 'rate-pre-L2', post: 'rate-post-L2' }, { label: 'L3 Applications', pre: 'rate-pre-L3', post: 'rate-post-L3' }], rateShow: 'post',
      work: [{ t: 'How confident are you now? 0 is not at all, 5 is completely.', f: [rate('rate-post-L1', 'L1 Tables'), rate('rate-post-L2', 'L2 Graphs'), rate('rate-post-L3', 'L3 Applications')] }, { t: '', f: [txt('c11-low', 'The target I feel least sure about, and why', 3)] }],
      ans: null }
  ];
})();
