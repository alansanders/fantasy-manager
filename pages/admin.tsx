import Menu from "../components/Menu";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import Head from "next/head.js";
import { getSession } from "next-auth/react";
import connect, { analytics, leagues } from "../Modules/database";
import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Slider, Typography } from "@mui/material";

interface props {
  analytics: analytics[];
  leagues: string[];
}
interface ChartData {
  fill: boolean;
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
}
// This function is used to sort an array of semantic versions
function compareSemanticVersions(key: string, a: any, b: any) {
  // 1. Split the strings into their parts.
  let a1 = a[key].split(".");
  let b1 = b[key].split(".");
  const len = Math.min(a1.length, b1.length); // Look through each part of the version number and compare.
  for (let i = 0; i < len; i++) {
    const a2 = +a1[i] || 0;
    const b2 = +b1[i] || 0;
    if (a2 !== b2) {
      // Returns if they are different
      return a2 < b2 ? 1 : -1;
    }
  }
  // We hit this if the all checked versions so far are equal
  return a1.length - b1.length;
}
export default function Home({ analytics, leagues }: props) {
  const [graphLength, setGraphLength] = useState(Math.sqrt(30));
  // Sorts the analytics by version number
  const sortedAnalytics = analytics.sort((a, b) =>
    compareSemanticVersions("version", a, b)
  );
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
  );

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Users",
        },
      },
    },
  };
  // Adds all the unique dates to a list
  const fullLabels: number[] = [];
  analytics.forEach((e) => {
    const date = e.day;
    if (!fullLabels.includes(date)) {
      fullLabels.push(date);
    }
  });
  fullLabels.sort();
  const labels = fullLabels.slice(calculateValue(graphLength) * -1);
  const historicalVersionColor = [
    (a: number) => `rgba(102, 187, 106, ${a})`,
    (a: number) => `rgba(41, 182, 246, ${a})`,
    (a: number) => `rgba(144, 202, 249, ${a})`,
    (a: number) => `rgba(206, 147, 216, ${a})`,
    (a: number) => `rgba(255, 167, 38, ${a})`,
  ];
  const otherVersionColor = (a: number) => `rgba(244, 67, 54, ${a})`;
  historicalVersionColor.reverse();
  const datasetActive: ChartData[] = [];
  const datasetInActive: ChartData[] = [];
  const BundesligaData: Record<string, number> = {};
  const BundesligaActiveData: Record<string, number> = {};
  const EPLData: Record<string, number> = {};
  const EPLActiveData: Record<string, number> = {};
  const WorldCup2022Data: Record<string, number> = {};
  const WorldCup2022ActiveData: Record<string, number> = {};
  let counter = 0;
  // Adds all the data to the dataset
  while (sortedAnalytics.length > counter) {
    type versionType = string | null;
    const version: versionType =
      historicalVersionColor.length > 0
        ? sortedAnalytics[counter].version
        : null;
    // Collects all the data for one version
    const activeData: Record<string, number> = {};
    const inactiveData: Record<string, number> = {};
    while (
      sortedAnalytics.length > counter &&
      (version === null || sortedAnalytics[counter].version === version)
    ) {
      let data = sortedAnalytics[counter];
      counter++;
      if (data) {
        // Calculates all the league data
        // Bundesliga Data
        if (!BundesligaData[String(data?.day)]) {
          BundesligaData[String(data?.day)] = 0;
        }
        BundesligaData[String(data?.day)] +=
          data.Bundesliga - data.BundesligaActive;
        if (!BundesligaActiveData[String(data?.day)]) {
          BundesligaActiveData[String(data?.day)] = 0;
        }
        BundesligaActiveData[String(data?.day)] += data.BundesligaActive;
        // EPL Data
        if (!EPLData[String(data?.day)]) {
          EPLData[String(data?.day)] = 0;
        }
        EPLData[String(data?.day)] += data.EPL - data.EPLActive;
        if (!EPLActiveData[String(data?.day)]) {
          EPLActiveData[String(data?.day)] = 0;
        }
        EPLActiveData[String(data?.day)] += data.EPLActive;
        // World Cup 2022
        if (!WorldCup2022Data[String(data?.day)]) {
          WorldCup2022Data[String(data?.day)] = 0;
        }
        WorldCup2022Data[String(data?.day)] +=
          data.WorldCup2022 - data.WorldCup2022Active;
        if (!WorldCup2022ActiveData[String(data?.day)]) {
          WorldCup2022ActiveData[String(data?.day)] = 0;
        }
        WorldCup2022ActiveData[String(data?.day)] += data.WorldCup2022Active;
        // Calculates all the version data
        if (!activeData[String(data?.day)]) {
          activeData[String(data?.day)] = 0;
        }
        activeData[String(data?.day)] += data.activeUsers;
        if (!inactiveData[String(data?.day)]) {
          inactiveData[String(data?.day)] = 0;
        }
        inactiveData[String(data?.day)] += data.users - data.activeUsers;
      }
    }
    let color = historicalVersionColor.pop();
    // If this is the other category then it switches to the other color
    if (!color) {
      color = otherVersionColor;
    }
    datasetActive.push({
      fill: true,
      label: (version ? version : "Other") + " Active",
      data: labels.map((e) =>
        activeData[String(e)] ? activeData[String(e)] : 0
      ),
      borderColor: color(1),
      backgroundColor: color(1),
    });
    datasetInActive.push({
      fill: true,
      label: (version ? version : "Other") + " Inactive",
      data: labels.map((e) =>
        inactiveData[String(e)] ? inactiveData[String(e)] : 0
      ),
      borderColor: color(0.7),
      backgroundColor: color(0.6),
    });
  }
  const versionData = {
    // Makes the labels nicer to read
    labels: labels.map((e) => {
      const date = new Date(e * 3600 * 24 * 1000);
      return date.toDateString();
    }),
    datasets: [...datasetActive, ...datasetInActive],
  };
  const leagueData = {
    // Makes the labels nicer to read
    labels: labels.map((e) => {
      const date = new Date(e * 3600 * 24 * 1000);
      return date.toDateString();
    }),
    datasets: [
      {
        fill: true,
        label: "Bundesliga Active",
        data: labels.map((e) =>
          BundesligaActiveData[String(e)] ? BundesligaActiveData[String(e)] : 0
        ),
        borderColor: "rgba(209, 3, 19, 1)",
        backgroundColor: "rgba(209, 3, 19, 1)",
      },
      {
        fill: true,
        label: "EPL Active",
        data: labels.map((e) =>
          EPLActiveData[String(e)] ? EPLActiveData[String(e)] : 0
        ),
        borderColor: "rgba(61, 25, 91, 1)",
        backgroundColor: "rgba(61, 25, 91, 1)",
      },
      {
        fill: true,
        label: "World Cup 2022 Active",
        data: labels.map((e) =>
          WorldCup2022ActiveData[String(e)]
            ? WorldCup2022ActiveData[String(e)]
            : 0
        ),
        borderColor: "rgba(86, 4, 44, 1)",
        backgroundColor: "rgba(86, 4, 44, 1)",
      },
      {
        fill: true,
        label: "Bundesliga",
        data: labels.map((e) =>
          BundesligaData[String(e)] ? BundesligaData[String(e)] : 0
        ),
        borderColor: "rgba(209, 3, 19, 0.7)",
        backgroundColor: "rgba(209, 3, 19, 0.6)",
      },
      {
        fill: true,
        label: "EPL",
        data: labels.map((e) => (EPLData[String(e)] ? EPLData[String(e)] : 0)),
        borderColor: "rgba(61, 25, 91, 0.7)",
        backgroundColor: "rgba(61, 25, 91, 0.6)",
      },
      {
        fill: true,
        label: "World Cup 2022",
        data: labels.map((e) =>
          WorldCup2022Data[String(e)] ? WorldCup2022Data[String(e)] : 0
        ),
        borderColor: "rgba(86, 4, 44, 0.7)",
        backgroundColor: "rgba(86, 4, 44, 0.6)",
      },
    ],
  };
  // This is used to give the scale a logarithmic values
  function calculateValue(value: number) {
    return Math.floor(value ** 2);
  }
  // Handles when the graph slider changes
  function graphLengthChange(e: Event, value: number | number[]) {
    if (typeof value === "number") {
      setGraphLength(value);
    }
  }
  return (
    <>
      <Head>
        <title>Admin Panel</title>
      </Head>
      <Menu />
      <h1>Admin Panel</h1>
      <h2>Analytics</h2>
      <h3>Version Data</h3>
      <p>
        This graph shows how many users are using each (server) version. Active
        users are defined as users that are active on that day.
      </p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={versionData} />
      </div>
      <h3>League Type Data</h3>
      <p>
        This graph shows how many users are using each league type. Note that
        users are counted based on how many leagues they are in and that this
        data only exists for servers on v1.8.0 or later.
      </p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={leagueData} />
      </div>
      <Typography id="graph-length" gutterBottom>
        Graph Data Length: {calculateValue(graphLength)} Days
      </Typography>
      <div style={{ width: "95%", margin: "2%" }}>
        <Slider
          value={graphLength}
          min={1}
          step={Math.floor(Math.sqrt(Math.max(fullLabels.length, 30))) / 100}
          max={Math.sqrt(Math.max(fullLabels.length, 30))}
          scale={calculateValue}
          onChange={graphLengthChange}
          valueLabelDisplay="auto"
          aria-labelledby="non-linear-slider"
        />
      </div>
      <h2>Enabled League Types</h2>
      <p>
        The Bundesliga is{" "}
        {leagues.includes("Bundesliga")
          ? "enabled."
          : "disabled. To enable enter a bundesliga api key as directed in the leagues.md file into the enviromental variable BUNDESLIGA_API."}
      </p>
      <p>
        The English Premier League is{" "}
        {leagues.includes("EPL")
          ? "enabled."
          : "disabled. To enable set the enviromental variable ENABLE_EPL to enable."}
      </p>
      <p>
        The World Cup 2022 is{" "}
        {leagues.includes("WorldCup2022")
          ? "enabled."
          : "disabled. To enable set the enviromental variable ENABLE_WORDCUP2022 to enable."}
      </p>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (
  ctx: GetServerSidePropsContext
) => {
  const user = await getSession(ctx);
  // Makes sure the user is logged in
  if (!user) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(
          ctx.resolvedUrl
        )}`,
        permanent: false,
      },
    };
  }
  if (user.user.admin) {
    // Used to find the amount of historical data to get
    const connection = await connect();
    const analytics = await connection.query(
      "SELECT * FROM analytics ORDER By day ASC"
    );
    connection.end();
    return {
      props: { analytics, leagues },
    };
  }
  return {
    notFound: true,
  };
};
