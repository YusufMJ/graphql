import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './App.css';

function App() {
  const [jwt, setJwt] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userXP, setUserXP] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [headerMessage, setHeaderMessage] = useState("Please trust me and use your reboot credentials thank you");
  const [userStats, setUserStats] = useState(null);
  const chartRef = useRef(null);
  const [skillsData, setSkillsData] = useState([]);
  const skillsChartRef = useRef(null);
  const [timelineData, setTimelineData] = useState([]);
  const timelineChartRef = useRef(null);
  const [usersAboveLevel, setUsersAboveLevel] = useState(null);
  const [usersAboveLevelInCohort, setUsersAboveLevelInCohort] = useState(null);
  const [cohort, setCohort] = useState(null);
  const [cohortRank, setCohortRank] = useState(null);
  const [showUsersAbove, setShowUsersAbove] = useState(false);
  const [showUsersAboveInCohort, setShowUsersAboveInCohort] = useState(false);
  const [usersAboveList, setUsersAboveList] = useState([]);
  const [usersAboveInCohortList, setUsersAboveInCohortList] = useState([]);
  const [leadershipCount, setLeadershipCount] = useState(null);
  const [leadershipProjects, setLeadershipProjects] = useState([]);
  const [showLeadershipProjects, setShowLeadershipProjects] = useState(false);
  const [teamLeaderProjects, setTeamLeaderProjects] = useState([]);
  const [showTeamLeaderProjects, setShowTeamLeaderProjects] = useState(false);
  const [mostFrequentLeader, setMostFrequentLeader] = useState(null);

  const queries = {
    auditQ: `query auditsQuery {
      audit(order_by: { endAt: desc }) {
        group {
          path
          status
          captainLogin
        }
        auditorId
        auditorLogin
        endAt
        grade
        updatedAt
        createdAt
        auditedAt
        auditor {
          id
        }
      }
    }`,
    basicInformation: `query User1 {
      user {
        auditRatio
        firstName
        lastName
        totalDown
        totalUp
      }
    }`,
    skillsDistribution: `
      query Transaction2 {
        transaction(
          where: {
            type: {
              _iregex: "(^|[^[:alnum:]_])[[:alnum:]_]*skill_[[:alnum:]_]*($|[^[:alnum:]_])"
            }
          }
        ) {
          amount
          type
        }
      }
    `,
    timelineGraph: `
      query timeline_graph {
        user {
          login
          timeline: transactions(
            where: {type: {_eq: "xp"}, _or: [{attrs: {_eq: {}}}, {attrs: {_has_key: "group"}}], _and: [{path: {_nlike: "%/piscine-js/%"}}, {path: {_nlike: "%/piscine-go/%"}}]}
          ) {
            amount
            createdAt
            path
          }
        }
      }
    `,
    userInfo: `
      query UserInfo {
        user {
          login
          firstName
          lastName
          auditRatio
          totalUp
          totalDown
        }
      }
    `,
    userLevel: `
      query UserDetails($userLogin: String!) {
        event_user(
          where: { event: { path: { _eq: "/bahrain/bh-module" } }, userLogin: { _eq: $userLogin } }
        ) {
          userLogin
          level
          event {
            id
          }
        }
      }
    `,
    userXP: `query {
      transaction_aggregate(
        where: {
          event: { path: { _eq: "/bahrain/bh-module" } }
          type: { _eq: "xp" }
        }
      ) {
        aggregate {
          sum {
            amount
          }
        }
      }
    }
    `,
    usersAboveInAllReboot: `
      query UsersLevelGreaterThanInAll($level: Int!) {
        event_user(
          where: { 
            event: { 
              path: { _eq: "/bahrain/bh-module" }
            },
            level: { _gte: $level }
          }
          order_by: { level: desc }
        ) {
          userLogin
          level
          event {
            campus
            id
          }
        }
      }
    `,
    usersAboveInCohort: `
      query UsersLevelGreaterThanInCohort($level: Int!, $eventId: Int!) {
        event_user(
          where: { 
            event: { 
              path: { _eq: "/bahrain/bh-module" },
              id: { _eq: $eventId }
            },
            level: { _gte: $level }
          }
          order_by: { level: desc }
        ) {
          userLogin
          level
          event {
            campus
            id
          }
        }
      }
    `,
    leadershipCount: `
      query LeadershipCount($userLogin: String!) {
        group_aggregate(where: { 
          _and: [
            { captainLogin: { _eq: $userLogin } },
            { object: { type: { _eq: "project" } } },
            { status: { _eq: finished } }
          ] 
        }) {
          aggregate {
            count
          }
        }
      }
    `,
    leadershipProjects: `
      query LeadershipProjects($userLogin: String!) {
        group(where: { 
          _and: [
            { captainLogin: { _eq: $userLogin } },
            { object: { type: { _eq: "project" } } },
            { status: { _eq: finished } }
          ] 
        }) {
          members {
            userLogin
          }
          object {
            name
          }
          path
        }
      }
    `,
    teamLeaders: `
      query TeamLeaders($userLogin: String!) {
        group(where: { 
          _and: [
            { captainLogin: { _neq: $userLogin } },
            { object: { type: { _eq: "project" } } },
            { status: { _eq: finished } },
            { members: { userLogin: {_eq: $userLogin} } },
          ] 
        }) {
          captainLogin
          object {
            name
          }
          members {
            userLogin
          }
        }
      }
    `
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    const username = event.target.login.value;
    const password = event.target.password.value;

    const credentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        setJwt(data);
        setIsSignedIn(true);
        setHeaderMessage(", You shouldn't share your password with strangers.");

        const result = await queryData(queries.basicInformation);
        setUserInfo({
          ...userInfo,
          firstAndLastName: `${result.data.user[0].firstName} ${result.data.user[0].lastName}`
        });
        setHeaderMessage(userInfo.firstAndLastName + headerMessage);
      } else {
        const errorData = await response.json();
        console.error('Sign-in failed:', errorData.message || response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const queryData = async (query, variables = {}) => {
    try {
      const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ query, variables })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('GraphQL response:', result);
        return result;
      } else {
        const errorData = await response.json();
        console.error('GraphQL query failed:', errorData.message || response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUserStats = async () => {
    const result = await queryData(queries.basicInformation);
    if (result && result.data && result.data.user && result.data.user[0]) {
      setUserStats(result.data.user[0]);
    }
  };

  const fetchSkillsData = async () => {
    const result = await queryData(queries.skillsDistribution);
    console.log('Raw query result:', result);
    
    if (result && result.data && result.data.transaction) {
      const skillsMap = result.data.transaction.reduce((acc, item) => {
        const skill = item.type.replace(/^skill_/, '');
        acc[skill] = (acc[skill] || 0) + item.amount;
        return acc;
      }, {});

      const processedData = Object.entries(skillsMap)
        .map(([skill, amount]) => ({ skill, amount }))
        .sort((a, b) => b.amount - a.amount);

      console.log('Processed and aggregated skills data:', processedData);
      setSkillsData(processedData);
    } else {
      console.log('No transaction data found in the query result');
      setSkillsData([]);
    }
  };

  const fetchTimelineData = async () => {
    const result = await queryData(queries.timelineGraph);
    if (result && result.data && result.data.user && result.data.user[0]) {
      const processedData = result.data.user[0].timeline.map(item => ({
        date: new Date(item.createdAt),
        amount: item.amount,
        path: item.path
      })).sort((a, b) => a.date - b.date);
      setTimelineData(processedData);
    }
  };

  const fetchUserData = async () => {
    try {
      // Fetch user info first
      const infoResult = await queryData(queries.userInfo);
      if (infoResult && infoResult.data && infoResult.data.user && infoResult.data.user[0]) {
        const userInfo = infoResult.data.user[0];
        setUserInfo(userInfo);

        // Now that we have the user's login, fetch the level and cohort
        const levelResult = await queryData(queries.userLevel, { userLogin: userInfo.login });
        if (levelResult && levelResult.data && levelResult.data.event_user && levelResult.data.event_user[0]) {
          const level = levelResult.data.event_user[0].level;
          const eventId = levelResult.data.event_user[0].event.id;
          setUserLevel(level);
          setCohort(eventId);

          // Count users above this level in all of Reboot01
          const countAllResult = await queryData(queries.usersAboveInAllReboot, { level: level });
          if (countAllResult && countAllResult.data && countAllResult.data.event_user) {
            setUsersAboveLevel(countAllResult.data.event_user.length);
          } else {
            console.error('Failed to fetch count of users above level in all of Reboot01');
            setUsersAboveLevel(null);
          }

          // Count users above this level in the same cohort
          const countCohortResult = await queryData(queries.usersAboveInCohort, { level: level, eventId: eventId });
          if (countCohortResult && countCohortResult.data && countCohortResult.data.event_user) {
            setUsersAboveLevelInCohort(countCohortResult.data.event_user.length);
          } else {
            console.error('Failed to fetch count of users above level in cohort');
            setUsersAboveLevelInCohort(null);
          }

          // Fetch users in the same cohort with level >= user's level
          const cohortResult = await queryData(queries.usersAboveInCohort, { eventId: eventId, level: level });
          if (cohortResult && cohortResult.data && cohortResult.data.event_user) {
            const rank = cohortResult.data.event_user.findIndex(user => user.userLogin === userInfo.login) + 1;
            setCohortRank(rank);
          } else {
            console.error('Failed to fetch cohort ranking');
            setCohortRank(null);
          }
        } else {
          console.error('Failed to fetch user level');
          setUserLevel(null);
          setCohort(null);
        }

        // Fetch XP
        const xpResult = await queryData(queries.userXP);
        if (xpResult && xpResult.data && xpResult.data.transaction_aggregate) {
          setUserXP(xpResult.data.transaction_aggregate.aggregate.sum.amount);
        } else {
          console.error('Failed to fetch user XP');
          setUserXP(null);
        }

        // Fetch leadership count
        const leadershipResult = await queryData(queries.leadershipCount, { userLogin: userInfo.login });
        if (leadershipResult && leadershipResult.data && leadershipResult.data.group_aggregate) {
          setLeadershipCount(leadershipResult.data.group_aggregate.aggregate.count);
        } else {
          console.error('Failed to fetch leadership count');
          setLeadershipCount(null);
        }
      } else {
        console.error('Failed to fetch user info');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUsersAbove = async (inCohort = false) => {
    const query = inCohort ? queries.usersAboveInCohort : queries.usersAboveInAllReboot;
    const variables = inCohort 
      ? { level: userLevel, eventId: cohort }
      : { level: userLevel };

    try {
      const result = await queryData(query, variables);
      if (result && result.data && result.data.event_user) {
        if (inCohort) {
          setUsersAboveInCohortList(result.data.event_user);
          setShowUsersAboveInCohort(true);
        } else {
          setUsersAboveList(result.data.event_user);
          setShowUsersAbove(true);
        }
      } else {
        console.error('Failed to fetch users above');
      }
    } catch (error) {
      console.error('Error fetching users above:', error);
    }
  };

  const fetchLeadershipProjects = async () => {
    try {
      const result = await queryData(queries.leadershipProjects, { userLogin: userInfo.login });
      if (result && result.data && result.data.group) {
        setLeadershipProjects(result.data.group);
      } else {
        console.error('Failed to fetch leadership projects');
      }
    } catch (error) {
      console.error('Error fetching leadership projects:', error);
    }
  };

  const fetchTeamLeaderData = async () => {
    try {
      const result = await queryData(queries.teamLeaders, { userLogin: userInfo.login });
      if (result && result.data && result.data.group) {
        const leaderCounts = result.data.group.reduce((acc, project) => {
          acc[project.captainLogin] = (acc[project.captainLogin] || 0) + 1;
          return acc;
        }, {});

        const mostFrequent = Object.entries(leaderCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        setMostFrequentLeader({
          login: mostFrequent[0],
          count: mostFrequent[1]
        });

        setTeamLeaderProjects(result.data.group.filter(project => project.captainLogin === mostFrequent[0]));
      } else {
        console.error('Failed to fetch team leader data');
      }
    } catch (error) {
      console.error('Error fetching team leader data:', error);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchUserStats();
      fetchSkillsData();
      fetchTimelineData();
      fetchUserData();
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (userStats) {
      createBarChart();
    }
  }, [userStats]);

  useEffect(() => {
    console.log('skillsData updated:', skillsData);
    if (skillsData.length > 0) {
      createRadialChart();
    }
  }, [skillsData]);

  useEffect(() => {
    if (timelineData.length > 0) {
      createTimelineChart();
    }
  }, [timelineData]);

  useEffect(() => {
    if (isSignedIn && userInfo) {
      fetchLeadershipProjects();
      fetchTeamLeaderData();
    }
  }, [isSignedIn, userInfo]);

  const createBarChart = () => {
    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 300 - margin.left - margin.right;
    const height = 60 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const total = userStats.totalUp + userStats.totalDown;
    const upRatio = userStats.totalUp / total;

    const defs = svg.append("defs");

    const backgroundGradient = defs.append("linearGradient")
      .attr("id", "background-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    backgroundGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f3f4f6");

    backgroundGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#e5e7eb");

    const upGradient = defs.append("linearGradient")
      .attr("id", "up-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    upGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#34d399");

    upGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981");

    g.append("rect")
      .attr("class", "bar-background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "url(#background-gradient)");

    g.append("rect")
      .attr("class", "bar up")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", height)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "url(#up-gradient)")
      .attr("width", width * upRatio);

    g.append("text")
      .attr("class", "label up")
      .attr("x", 10)
      .attr("y", height / 2)
      .attr("dy", "0.35em")
      .text(`Up: ${userStats.totalUp}`);

    g.append("text")
      .attr("class", "label down")
      .attr("x", width - 10)
      .attr("y", height / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(`Down: ${userStats.totalDown}`);

    svg.append("text")
      .attr("class", "ratio-text")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + 25)
      .attr("text-anchor", "middle")
      .text(`Audit Ratio: ${userStats.auditRatio.toFixed(2)}`);
  };

  const createRadialChart = () => {
    console.log('Creating radial chart with data:', skillsData);
    
    const svg = d3.select(skillsChartRef.current);
    if (!svg.node()) {
      console.error('SVG element not found');
      return;
    }
    
    svg.selectAll("*").remove(); // Clear existing chart

    const width = 600;
    const height = 400;
    const margin = 40;
    const legendWidth = 200;

    const radius = Math.min(width - legendWidth, height) / 2 - margin;

    const g = svg.append("g")
      .attr("transform", `translate(${(width - legendWidth) / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Use only top 10 skills for better readability
    const topSkills = skillsData.slice(0, 10);
    console.log('Top 10 skills:', topSkills);

    const pie = d3.pie()
      .value(d => d.amount)
      .sort(null);

    const arc = d3.arc()
      .outerRadius(radius * 0.8)
      .innerRadius(radius * 0.4);

    const slice = g.selectAll(".arc")
      .data(pie(topSkills))
      .enter().append("g")
      .attr("class", "arc");

    slice.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.skill))
      .attr("stroke", "var(--primary-bg)")
      .attr("stroke-width", "1px")
      .style("opacity", 0.7)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.7);
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - legendWidth}, 20)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(topSkills)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        const opacity = slice.select(`path[fill="${color(d.skill)}"]`).style("opacity");
        slice.select(`path[fill="${color(d.skill)}"]`)
          .style("opacity", opacity == 1 ? 0.7 : 1);
        d3.select(this).style("opacity", opacity == 1 ? 0.7 : 1);
      });

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", d => color(d.skill));

    legendItems.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(d => `${d.skill} (${d.amount})`)
      .style("fill", "var(--text-primary)")
      .style("font-size", "12px");

    console.log('Legend items created:', legendItems.size());

    // Add total skills amount
    const totalAmount = topSkills.reduce((sum, skill) => sum + skill.amount, 0);
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(`Total: ${totalAmount}`)
      .style("fill", "var(--text-primary)")
      .style("font-size", "16px");
  };

  const createTimelineChart = () => {
    const svg = d3.select(timelineChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.amount)])
      .range([height, 0]);

    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.amount));

    g.append("path")
      .datum(timelineData)
      .attr("fill", "none")
      .attr("stroke", "var(--accent)")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y));

    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .attr("text-anchor", "middle")
      .text("Date")
      .style("fill", "var(--text-primary)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text("XP")
      .style("fill", "var(--text-primary)");
  };

  const getRank = (level) => {
    if (level < 5) return "Novice";
    if (level < 10) return "Apprentice";
    if (level < 15) return "Adept";
    if (level < 20) return "Expert";
    return "Master";
  };

  const getCohortNumber = (eventId) => {
    switch (eventId) {
      case 72:
        return 2;
      case 20:
        return 1;
      default:
        return 3;
    }
  };

  return (
    <div className="container">
      <header>{headerMessage}</header>
      <main>
        {!isSignedIn ? (
          <form id="signinForm" onSubmit={handleSignIn}>
            <label htmlFor="login">Username or Email:</label>
            <input id="login" name="login" type="text" required />
            <label htmlFor="password">Password:</label>
            <input id="password" name="password" type="password" required />
            <button type="submit">Sign in</button>
          </form>
        ) : (
          <div className="flexContainer" id="signedInContent">
            <div className="section">
              <div className="title">Achievements</div>
              {userInfo && userLevel !== null && userXP !== null && usersAboveLevel !== null && usersAboveLevelInCohort !== null && cohort !== null && cohortRank !== null ? (
                <>
                  <div className="namelvlrank">
                    <div className="name">{`${userInfo.firstName} ${userInfo.lastName}`}</div>
                    <div className="lvl">{`Level ${userLevel}`}</div>
                    <div className="rank">{getRank(userLevel)}</div>
                  </div>
                  <div className="info">
                    <p>Total XP: {userXP}</p>
                    <p>Audit Ratio: {userInfo.auditRatio.toFixed(2)}</p>
                    <p>Total Up: {userInfo.totalUp}</p>
                    <p>Total Down: {userInfo.totalDown}</p>
                    <p>You are top {usersAboveLevel + 1} in all of Reboot01</p>
                    <p>You are in Cohort {getCohortNumber(cohort)}</p>
                    <p>You are top {usersAboveLevelInCohort + 1} in your Reboot01 cohort</p>
                  </div>
                </>
              ) : (
                <p>Loading user information...</p>
              )}
            </div>
            <div className="section">
              <div className="title">Interesting info</div>
              <div className="info">
                {leadershipCount !== null && (
                  <>
                    <p>You were team leader for {leadershipCount} projects</p>
                    <button onClick={() => {
                      setShowLeadershipProjects(!showLeadershipProjects);
                      if (!showLeadershipProjects && leadershipProjects.length === 0) {
                        fetchLeadershipProjects();
                      }
                    }}>
                      {showLeadershipProjects ? 'Hide projects' : 'Which projects?'}
                    </button>
                    {showLeadershipProjects && (
                      <ul className={showLeadershipProjects ? 'show' : ''}>
                        {leadershipProjects.map((project, index) => (
                          <li key={index}>
                            <strong>{project.object.name}</strong>
                            <br />
                            Members: {project.members.map(member => member.userLogin).join(', ')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {mostFrequentLeader && (
                  <>
                    <p>{mostFrequentLeader.login} was your team leader for {mostFrequentLeader.count} projects</p>
                    <button onClick={() => {
                      setShowTeamLeaderProjects(!showTeamLeaderProjects);
                      if (!showTeamLeaderProjects && teamLeaderProjects.length === 0) {
                        fetchTeamLeaderData();
                      }
                    }}>
                      {showTeamLeaderProjects ? 'Hide projects' : 'Which projects?'}
                    </button>
                    {showTeamLeaderProjects && (
                      <ul className={showTeamLeaderProjects ? 'show' : ''}>
                        {teamLeaderProjects.map((project, index) => (
                          <li key={index}>
                            <strong>{project.object.name}</strong>
                            <br />
                            Members: {project.members.map(member => member.userLogin).join(', ')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="section">
              <div className="title">Audit Ratio</div>
              <svg ref={chartRef} width="300" height="100"></svg>
            </div>
            <div className="section">
              <div className="title">Skills Distribution</div>
              <svg ref={skillsChartRef} width="600" height="400"></svg>
            </div>
            <div className="section">
              <div className="title">XP Timeline</div>
              <svg ref={timelineChartRef} width="600" height="400"></svg>
            </div>
            <div className="section">
              <div className="title">Rankings</div>
              <div className="info">
                <p>You are top {usersAboveLevel + 1} in all of Reboot01</p>
                <button onClick={() => {
                  setShowUsersAbove(!showUsersAbove);
                  if (!showUsersAbove && usersAboveList.length === 0) {
                    fetchUsersAbove(false);
                  }
                }}>
                  {showUsersAbove ? 'Hide users above you' : 'Want to see who is above you?'}
                </button>
                {showUsersAbove && (
                  <ul className={showUsersAbove ? 'show' : ''}>
                    {usersAboveList.map((user, index) => (
                      <li key={user.userLogin}>{user.userLogin} - Level {user.level}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="info">
                <p>You are in Cohort {getCohortNumber(cohort)}</p>
                <p>You are top {usersAboveLevelInCohort + 1} in your Reboot01 cohort</p>
                <button onClick={() => {
                  setShowUsersAboveInCohort(!showUsersAboveInCohort);
                  if (!showUsersAboveInCohort && usersAboveInCohortList.length === 0) {
                    fetchUsersAbove(true);
                  }
                }}>
                  {showUsersAboveInCohort ? 'Hide users above you in cohort' : 'Want to see who is above you in your cohort?'}
                </button>
                {showUsersAboveInCohort && (
                  <ul className={showUsersAboveInCohort ? 'show' : ''}>
                    {usersAboveInCohortList.map((user, index) => (
                      <li key={user.userLogin}>{user.userLogin} - Level {user.level}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer>scree</footer>
    </div>
  );
}

export default App;