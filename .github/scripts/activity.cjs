// Render with Ashutosh00710/github-readme-activity-graph's original Card.
// The hosted deployment is disabled, so publish the SVGs from Actions instead.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const upstream = path.resolve(process.env.ACTIVITY_SOURCE || '.upstream/activity');
require(path.join(upstream, 'node_modules/ts-node')).register({
  transpileOnly: true,
  project: path.join(upstream, 'tsconfig.json'),
});
const { Card } = require(path.join(upstream, 'src/GraphCards.ts'));

async function main() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  start.setUTCHours(0, 0, 0, 0);
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){contributionsCollection(from:$from,to:$to){
      contributionCalendar{weeks{contributionDays{date contributionCount}}}
    }}
  }`;
  const response = JSON.parse(execFileSync('gh', ['api', 'graphql',
    '-f', `query=${query}`, '-f', `login=${process.env.PROFILE_USER || 'linjunhao666'}`,
    '-f', `from=${start.toISOString()}`, '-f', `to=${end.toISOString()}`], {encoding:'utf8'}));
  if (response.errors) throw new Error(JSON.stringify(response.errors));
  const first = start.toISOString().slice(0,10);
  const last = end.toISOString().slice(0,10);
  const days = response.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap(week => week.contributionDays)
    .filter(day => day.date >= first && day.date <= last);
  if (days.length !== 31) throw new Error(`Expected 31 days, got ${days.length}`);
  const data = days.map(day => ({date:String(Number(day.date.slice(-2))), contributionCount:day.contributionCount}));
  for (const mode of ['dark','light']) {
    const dark = mode === 'dark';
    const colors = {
      bgColor:dark ? '0d1117' : 'ffffff', borderColor:'00000000',
      color:dark ? '929bad' : '75829a', titleColor:dark ? '929bad' : '75829a',
      lineColor:dark ? 'ad9ce3' : '7b61b5', pointColor:dark ? '7bc9d5' : '368b9a',
      areaColor:dark ? '54428b' : 'b0a0d0',
    };
    const card = new Card(230, 900, 0, colors, '', true, true);
    // Compact spacing for the title-free card; retain the upstream renderer.
    const originalOptions = card.getOptions.bind(card);
    card.getOptions = () => {
      const options = originalOptions();
      options.chartPadding = {top:20,right:24,bottom:0,left:0};
      options.axisY.offset = 48;
      options.axisX.offset = 32;
      options.axisY.title = '';
      options.axisX.title = '';
      return options;
    };
    let svg = await card.buildGraph(data);
    svg = svg.replace(/<foreignObject x="0" y="0" width="900" height="50">[\s\S]*?<\/foreignObject>/, '');
    svg = svg.replace('</style>', `
      .ct-line {stroke-width:2.2px; animation-duration:3s;}
      .ct-point {stroke-width:4px;}
      .ct-grid {stroke-opacity:.12;}
      @media(prefers-reduced-motion:reduce) {
        .ct-line {animation:none;stroke-dashoffset:0;}
        .ct-point {animation:none;}
      }
    </style>`);
    fs.writeFileSync(`assets/activity-${mode}.svg`, svg.split("\n").map(line => line.trimEnd()).join("\n").trim() + "\n");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
