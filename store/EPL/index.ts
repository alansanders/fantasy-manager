import { clubs, forecast, position } from "#Modules/database";
import dataGetter, { players } from "#type/data";
import { EPLPlayers, EPLTeams } from "./types";

const Main: dataGetter = async function () {
  const nowTime = Math.floor(Date.now() / 1000);
  // Gets the data for the league
  const data: EPLPlayers = await fetch(
    "https://fantasy.premierleague.com/api/bootstrap-static/"
  ).then((e) => e.json());
  let newTransfer = true;
  let countdown = 0;
  let matchday = 0;
  let matchdayData: EPLTeams = [];
  // Finds the current matchday by going through each matchday and seeing if they are done
  while (matchday < data.events.length) {
    const currentData = data.events[matchday];
    if (currentData.finished === false) {
      newTransfer = currentData.deadline_time_epoch - nowTime > 0;
      // Gets the team data for the matchday
      matchdayData = await fetch(
        `https://fantasy.premierleague.com/api/fixtures/?event=${currentData.id}`
      )
        .then(async (val) => {
          if (val.ok) {
            return await val.json();
          } else {
            return [];
          }
        })
        .catch(() => []);
      countdown = newTransfer ? currentData.deadline_time_epoch - nowTime : 0;
      break;
    }
    matchday++;
  }
  // Gets the short_name for the club with this id
  const getTeam = (id: number): string => {
    const result = data.teams.filter((e) => e.id === id);
    if (result.length > 0) {
      return result[0].short_name;
    } else {
      return "";
    }
  };
  // Gets the list of teams and gets their data
  const teams = data.teams.map((club): clubs => {
    const homeGame = matchdayData.filter((e) => e.team_h === club.id);
    let opponent = "";
    let gameStart = 0;
    if (homeGame.length > 0) {
      gameStart = Date.parse(String(homeGame[0].kickoff_time)) / 1000;
      opponent = getTeam(homeGame[0].team_a);
    }
    const awayGame = matchdayData.filter((e) => e.team_a === club.id);
    if (awayGame.length > 0) {
      gameStart = Date.parse(String(awayGame[0].kickoff_time)) / 1000;
      opponent = getTeam(awayGame[0].team_h);
    }
    return { club: club.short_name, gameStart, opponent, league: "EPL" };
  });
  // Gets all the player data
  const players = data.elements
    .filter((e) => /*Checks if the player is transfered out*/ e.status !== "u")
    .map((e): players => {
      const teamData = data.teams[e.team - 1];
      let forecast: forecast = "u";
      if (e.chance_of_playing_this_round === 0) {
        forecast = "m";
      } else if (e.chance_of_playing_this_round === 100) {
        forecast = "a";
      }
      return {
        uid: String(e.code),
        name: e.first_name + " " + e.second_name,
        club: teamData.short_name,
        pictureUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${e.code}.png`,
        height: 140,
        width: 110,
        value: e.now_cost * 100000,
        position: ["", "gk", "def", "mid", "att"][e.element_type] as position,
        forecast,
        total_points: e.total_points,
        average_points: parseFloat(e.points_per_game),
        exists: true,
      };
    });
  return [newTransfer, countdown, players, teams];
};
export default Main;
