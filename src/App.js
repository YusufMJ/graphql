import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import './App.css';

function App() {
  const [jwt, setJwt] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userXP, setUserXP] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [headerMessage, setHeaderMessage] = useState("Please trust me and use your reboot credentials thank you");
  const [skillsData, setSkillsData] = useState([]);
  const skillsChartRef = useRef(null);
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
  const [auditRatioRanking, setAuditRatioRanking] = useState([]);
  const [cohortAuditRatioRanking, setCohortAuditRatioRanking] = useState([]);
  const [showAuditRatioRanking, setShowAuditRatioRanking] = useState(false);
  const [showCohortAuditRatioRanking, setShowCohortAuditRatioRanking] = useState(false);
  const [userAuditRatioRank, setUserAuditRatioRank] = useState(null);
  const [userCohortAuditRatioRank, setUserCohortAuditRatioRank] = useState(null);

  const queries = {
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
      query skills {
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
    `,
    usersLevelGreaterThanInAll: `
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
          userAuditRatio
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
        setHeaderMessage("You shouldn't share your password with strangers.");

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

  const queryData = useCallback(async (query, variables = {}) => {
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
  }, [jwt]);

  const fetchSkillsData = useCallback(async () => {
    const result = await queryData(queries.skillsDistribution);
    console.log('Raw query result:', result);
    
    if (result && result.data && result.data.transaction) {
      const skillsMap = result.data.transaction.reduce((acc, item) => {
        const skill = item.type.replace(/^skill_/, '');
        // Use Math.max to keep the highest amount for each skill
        acc[skill] = Math.max(acc[skill] || 0, item.amount);
        return acc;
      }, {});

      const processedData = Object.entries(skillsMap)
        .map(([skill, amount]) => ({ skill, amount }))
        .sort((a, b) => b.amount - a.amount);

      console.log('Processed skills data with maximum values:', processedData);
      setSkillsData(processedData);
    } else {
      console.log('No transaction data found in the query result');
      setSkillsData([]);
    }
  }, [queryData, queries.skillsDistribution]);

  const fetchUserData = useCallback(async () => {
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
  }, [queryData, queries.userInfo, queries.userLevel, queries.usersAboveInAllReboot, queries.usersAboveInCohort, queries.userXP, queries.leadershipCount]);

  const fetchUsersAbove = async (inCohort = false) => {
    const query = inCohort ? queries.usersAboveInCohort : queries.usersAboveInAllReboot;
    const variables = inCohort 
      ? { level: userLevel, eventId: cohort }
      : { level: userLevel };

    try {
      const result = await queryData(query, variables);
      if (result && result.data && result.data.event_user) {
        console.log(`Fetched ${result.data.event_user.length} users above`);
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

  const fetchLeadershipProjects = useCallback(async () => {
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
  }, [queryData, queries.leadershipProjects, userInfo]);

  const fetchTeamLeaderData = useCallback(async () => {
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
  }, [queryData, queries.teamLeaders, userInfo]);

  const fetchAuditRatioRankings = useCallback(async (inCohort = false) => {
    try {
      const result = await queryData(queries.usersLevelGreaterThanInAll, { level: 0 });
      if (result && result.data && result.data.event_user) {
        const sortedUsers = result.data.event_user
          .sort((a, b) => {
            const ratioA = parseFloat(a.userAuditRatio) || 0;
            const ratioB = parseFloat(b.userAuditRatio) || 0;
            return ratioB - ratioA;
          });
        
        const userRank = sortedUsers.findIndex(user => user.userLogin === userInfo.login) + 1;
        setUserAuditRatioRank(userRank);

        if (inCohort) {
          const cohortUsers = sortedUsers.filter(user => user.event.id === cohort);
          setCohortAuditRatioRanking(cohortUsers);
          const userCohortRank = cohortUsers.findIndex(user => user.userLogin === userInfo.login) + 1;
          setUserCohortAuditRatioRank(userCohortRank);
        } else {
          setAuditRatioRanking(sortedUsers);
        }
      } else {
        console.error('Failed to fetch audit ratio rankings');
      }
    } catch (error) {
      console.error('Error fetching audit ratio rankings:', error);
    }
  }, [queryData, queries.usersLevelGreaterThanInAll, cohort, userInfo]);

  useEffect(() => {
    if (isSignedIn) {
      fetchSkillsData();
      fetchUserData();
    }
  }, [isSignedIn, fetchSkillsData, fetchUserData]);

  const createRadarChart = useCallback(() => {
    const svg = d3.select(skillsChartRef.current);
    svg.selectAll("*").remove();

    const container = d3.select(skillsChartRef.current.parentNode);
    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = Math.min(containerWidth, 400);

    svg.attr("width", "100%")
       .attr("height", containerHeight)
       .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const margin = { top: 40, right: 50, bottom: 50, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2 * 0.8;

    const g = svg.append("g")
      .attr("transform", `translate(${containerWidth / 2}, ${containerHeight / 2})`);

    const data = skillsData.slice(0, 10);
    const angleSlice = Math.PI * 2 / data.length;

    const rScale = d3.scaleLinear()
      .range([0, radius])
      .domain([0, d3.max(data, d => d.amount)]);

    // Draw the circular grid
    const axisGrid = g.append("g").attr("class", "axisWrapper");

    axisGrid.selectAll(".levels")
      .data(d3.range(1, 6).reverse())
      .enter()
      .append("circle")
      .attr("class", "gridCircle")
      .attr("r", d => radius / 5 * d)
      .style("fill", "none")
      .style("stroke", "#CDCDCD")
      .style("stroke-width", "0.5px");

    // Draw the axes
    const axis = axisGrid.selectAll(".axis")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => rScale(d3.max(data, d => d.amount)) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d, i) => rScale(d3.max(data, d => d.amount)) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("class", "line")
      .style("stroke", "#CDCDCD")
      .style("stroke-width", "0.5px");

    // Draw the radar chart blobs
    const radarLine = d3.lineRadial()
      .curve(d3.curveLinearClosed)
      .radius(d => rScale(d.amount))
      .angle((d, i) => i * angleSlice);

    g.selectAll(".radarWrapper")
      .data([data])
      .enter().append("g")
      .attr("class", "radarWrapper")
      .append("path")
      .attr("class", "radarArea")
      .attr("d", radarLine)
      .style("fill", "rgb(116, 119, 191)")
      .style("fill-opacity", 0.5)
      .style("stroke", "rgb(116, 119, 191)")
      .style("stroke-width", "2px");

    // Append the labels and interactive circles
    axis.append("text")
      .attr("class", "legend")
      .style("font-size", "11px")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", (d, i) => rScale(d3.max(data, d => d.amount) * 1.15) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (d, i) => rScale(d3.max(data, d => d.amount) * 1.15) * Math.sin(angleSlice * i - Math.PI / 2))
      .text(d => d.skill)
      .style("fill", "#CCCCCC");

    // Add interactive circles
    axis.append("circle")
      .attr("class", "radarCircle")
      .attr("r", 5)
      .attr("cx", (d, i) => rScale(d.amount) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("cy", (d, i) => rScale(d.amount) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("fill", "rgb(116, 119, 191)")
      .style("fill-opacity", 0.8)
      .style("stroke", "#fff")
      .style("stroke-width", "2px")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 8)
          .style("fill", "rgb(255, 215, 0)");
        
        // Show tooltip
        const [x, y] = d3.pointer(event, svg.node());
        d3.select(".tooltip")
          .style("opacity", 1)
          .html(`${d.skill}: ${d.amount}`)
          .style("left", `${x + 10}px`)
          .style("top", `${y - 10}px`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 5)
          .style("fill", "rgb(116, 119, 191)");
        
        // Hide tooltip
        d3.select(".tooltip").style("opacity", 0);
      });

    // Add a title
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", "#FFFFFF")
      .text("Top 10 Skills");

    // Add tooltip div if it doesn't exist
    if (d3.select(".tooltip").empty()) {
      d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    }

  }, [skillsData]);

  useEffect(() => {
    if (skillsData.length > 0) {
      createRadarChart();
    }
  }, [skillsData, createRadarChart]);

  useEffect(() => {
    if (isSignedIn && userInfo) {
      fetchLeadershipProjects();
      fetchTeamLeaderData();
    }
  }, [isSignedIn, userInfo, fetchLeadershipProjects, fetchTeamLeaderData]);

  const getRank = (level) => {
    if (level === 0) return "Aspiring developer";
    if (level <= 10) return "Beginner developer";
    if (level <= 20) return "Apprentice developer";
    if (level <= 30) return "Assistant developer";
    if (level <= 40) return "Basic developer";
    if (level <= 50) return "Junior developer";
    return "Senior developer";
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

  const formatAuditRatio = (ratio) => {
    return typeof ratio === 'number' ? ratio.toFixed(2) : ratio;
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
                    <p>Audit Ratio: {formatAuditRatio(userInfo.auditRatio)}</p>
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
                      <div className="users-list-container">
                      <ul className={showTeamLeaderProjects ? 'show users-list' : 'users-list'}>
                        {teamLeaderProjects.map((project, index) => (
                          <li key={index}>
                            <strong>{project.object.name}</strong>
                            <br />
                            Members: {project.members.map(member => member.userLogin).join(', ')}
                          </li>
                        ))}
                      </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="section">
              <div className="title">Top 10 Skills</div>
              <div className="section-content">
                <div className="chart-container">
                  <svg ref={skillsChartRef}></svg>
                </div>
              </div>
            </div>
            <div className="section">
              <div className="title">Rankings</div>
              <div className="info">
                <p>You are top {usersAboveLevel + 1} in all of Reboot01</p>
                <button onClick={() => {
                  setShowUsersAbove(!showUsersAbove);
                  if (!showUsersAbove && usersAboveList.length === 0) {
                    console.log('Fetching users above');
                    fetchUsersAbove(false);
                  }
                }}>
                  {showUsersAbove ? 'Hide users above you' : 'Want to see who is above you?'}
                </button>
                {showUsersAbove && (
                  <>
                    <p>Total users above you: {usersAboveList.length}</p>
                    <div className="users-list-container">
                      <ul className={showUsersAbove ? 'show users-list' : 'users-list'}>
                        {usersAboveList.map((user, index) => (
                          <li key={user.userLogin}>{index + 1}. {user.userLogin} - Level {user.level}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="section">
              <div className="title">Cohort Ranking</div>
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
                  <div className="users-list-container">
                    <ul className={showUsersAboveInCohort ? 'show users-list' : 'users-list'}>
                      {usersAboveInCohortList.map((user, index) => (
                        <li key={user.userLogin}>{user.userLogin} - Level {user.level}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="section">
              <div className="title">Audit Ratio Ranking</div>
              <div className="info">
                <p>Your Audit Ratio: {formatAuditRatio(userInfo?.auditRatio)}</p>
                <p>You are in Cohort {getCohortNumber(cohort)}</p>
                {userAuditRatioRank && <p>Your Audit Ratio Rank: {userAuditRatioRank} out of {auditRatioRanking.length}</p>}
                <button onClick={() => {
                  setShowAuditRatioRanking(!showAuditRatioRanking);
                  if (!showAuditRatioRanking && auditRatioRanking.length === 0) {
                    fetchAuditRatioRankings(false);
                  }
                }}>
                  {showAuditRatioRanking ? 'Hide Audit Ratio Ranking' : 'Show Audit Ratio Ranking'}
                </button>
                {showAuditRatioRanking && (
                  <div className="users-list-container">
                    <ul className="show users-list">
                      {auditRatioRanking.map((user, index) => (
                        <li key={user.userLogin}>
                          {index + 1}. {user.userLogin} (Cohort {getCohortNumber(user.event.id)}) - Audit Ratio: {formatAuditRatio(user.userAuditRatio)} 
                          {user.userLogin === userInfo.login && " (You)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="title">Cohort Audit Ratio Ranking</div>
              <div className="info">
                <p>Your Cohort: {getCohortNumber(cohort)}</p>
                {userCohortAuditRatioRank && <p>Your Cohort Audit Ratio Rank: {userCohortAuditRatioRank} out of {cohortAuditRatioRanking.length}</p>}
                <button onClick={() => {
                  setShowCohortAuditRatioRanking(!showCohortAuditRatioRanking);
                  if (!showCohortAuditRatioRanking && cohortAuditRatioRanking.length === 0) {
                    fetchAuditRatioRankings(true);
                  }
                }}>
                  {showCohortAuditRatioRanking ? 'Hide Cohort Audit Ratio Ranking' : 'Show Cohort Audit Ratio Ranking'}
                </button>
                {showCohortAuditRatioRanking && (
                  <div className="users-list-container">
                    <ul className="show users-list">
                      {cohortAuditRatioRanking.map((user, index) => (
                        <li key={user.userLogin}>
                          {index + 1}. {user.userLogin} - Audit Ratio: {formatAuditRatio(user.userAuditRatio)} 
                          {user.userLogin === userInfo.login && " (You)"}
                        </li>
                      ))}
                    </ul>
                  </div>
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