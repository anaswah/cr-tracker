/**
 * Clash Royale Web Engine v26.0 - Ultimate E-Sports UX Update
 * Engineered for M7amd 3naswah
 */

const PROXY_BASE = "https://Anaswah20011.pythonanywhere.com";

const GOLD_LADDER = [0, 0, 5, 20, 50, 150, 400, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 120000];
const MAX_LEVEL = GOLD_LADDER.length - 1; // 16 (Level 15 in-game mapping)

const CARD_LADDER = {
  "common":     [0, 1, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1000, 1500, 2500, 3500, 5500, 7500],
  "rare":       [0, 0, 0, 1, 2, 4, 10, 20, 50, 100, 200, 300, 400, 550, 750, 1000, 1400],
  "epic":       [0, 0, 0, 0, 0, 0, 1, 2, 4, 10, 20, 30, 50, 70, 100, 130, 180],
  "legendary":  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 6, 9, 12, 14, 20],
  "champion":   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 5, 8, 11, 15]
};

const UPGRADE_XP_REWARD = [0, 0, 4, 5, 6, 10, 25, 50, 100, 200, 400, 600, 800, 1600, 2000, 50000, 200000];
const XP_LADDER = [0, 20, 50, 50, 50, 80, 120, 125, 130, 145, 200, 220, 280, 300, 350, 450, 550, 650, 800, 1200, 1400, 1600, 2000, 2300, 2700, 3000, 4000, 4600, 5400, 6000, 7000, 8000, 9000, 11000, 12500, 12500, 12500, 12500, 15000, 18000, 22000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 40000, 55000, 70000, 85000, 100000, 115000, 130000, 145000, 160000, 180000, 200000, 220000, 240000, 260000, 280000, 300000, 320000, 340000, 360000, 390000, 420000, 450000, 550000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000];

const START_LVL = { "common": 1, "rare": 3, "epic": 6, "legendary": 9, "champion": 11 };
const RARITY_RANK = { "champion": 1, "legendary": 2, "epic": 3, "rare": 4, "common": 5 };
const CHAMPION_NAMES = ["Skeleton King", "Golden Knight", "Archer Queen", "Mighty Miner", "Monk", "Little Prince", "Goblinstein", "Boss Bandit"];

const RARITY_DB = {
  "26000069": "champion", "26000074": "champion", "26000072": "champion", "26000065": "champion", 
  "26000077": "champion", "26000093": "champion", "26000099": "champion", "26000103": "champion",
  "159000000": "common", "159000001": "epic", "159000002": "legendary", "159000004": "legendary"
};

const BACKUP_TOWERS = [
  { id: 159000000, name: "Tower Princess", rarity: "common" },
  { id: 159000001, name: "Cannoneer", rarity: "epic" },
  { id: 159000002, name: "Dagger Duchess", rarity: "legendary" },
  { id: 159000004, name: "Royal Chef", rarity: "legendary" }
];

Chart.defaults.color = '#a1a1aa';
Chart.defaults.font.family = "'Inter', sans-serif";

let chartGold, chartCards, chartXp, chartLevels, chartWinLoss;
let globalResults = []; 
let globalMinLevel = 14;
let currentActiveFilter = 'all';

function getCardImageUrl(cardName) {
    if (!cardName) return "";
    let cleanName = cardName.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-');
    return `https://cdn.royaleapi.com/static/img/cards/${cleanName}.png`;
}

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    let activeBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if(activeBtn) activeBtn.classList.add('active');
}

function filterCards(filterType) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.querySelector(`.filter-btn[onclick*="${filterType}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    currentActiveFilter = filterType;
    renderMainTable(); 
    let tableContainer = document.querySelector('.table-container');
    if (tableContainer) tableContainer.scrollTop = 0;
}

document.addEventListener("DOMContentLoaded", () => {
    loadTagHistory();
    document.getElementById("playerTag").addEventListener("keypress", function(event) {
        if (event.key === "Enter") { event.preventDefault(); startAnalysis(); }
    });
});

function loadTagHistory() {
    let history = JSON.parse(localStorage.getItem("cr_tag_history")) || [];
    let datalist = document.getElementById("tagHistory");
    if(datalist) {
        datalist.innerHTML = "";
        history.forEach(tag => {
            let option = document.createElement("option"); option.value = tag; datalist.appendChild(option);
        });
    }
    if (!document.getElementById("playerTag").value && history.length > 0) {
        document.getElementById("playerTag").value = history[0];
    }
}

function saveTagToHistory(tag) {
    if(!tag) return;
    let history = JSON.parse(localStorage.getItem("cr_tag_history")) || [];
    history = history.filter(t => t !== tag);
    history.unshift(tag);
    if (history.length > 10) history.pop();
    localStorage.setItem("cr_tag_history", JSON.stringify(history));
    loadTagHistory();
}

async function fetchAllCards() {
    let cached = localStorage.getItem("cr_allcards");
    if (cached) return JSON.parse(cached);
    let res = await fetch(`${PROXY_BASE}/allcards`);
    if (!res.ok) throw new Error("Failed to fetch allcards");
    let data = await res.json();
    localStorage.setItem("cr_allcards", JSON.stringify(data));
    return data;
}

// Progress bar HTML generator for tables
function getProgressBar(pct, colorHex) {
    let pctVal = Math.min(100, Math.max(0, pct * 100));
    return `<div class="table-progress-bg">
                <div class="table-progress-fill" style="width:${pctVal}%; background-color:${colorHex};"></div>
                <span class="table-progress-text">${pctVal.toFixed(1)}%</span>
            </div>`;
}

async function startAnalysis() {
    let rawTag = document.getElementById("playerTag").value.trim().toUpperCase();
    let tag = rawTag.startsWith("#") ? rawTag.substring(1) : rawTag;
    let statusMsg = document.getElementById("statusMessage");
    let dash = document.getElementById("dashboard");

    if (!tag) { statusMsg.innerText = "Please enter a valid Player Tag!"; return; }

    saveTagToHistory(tag);
    statusMsg.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting to Supercell Servers...`;
    statusMsg.style.color = "var(--accent-blue)";
    dash.classList.remove("hidden"); 
    dash.style.opacity = "0.5"; 

    try {
        let pRes = await fetch(`${PROXY_BASE}/player?tag=${tag}&_t=${new Date().getTime()}`, { cache: "no-store" });
        if (!pRes.ok) throw new Error(`Player not found or Server error (${pRes.status})`);
        let pData = await pRes.json();
        
        statusMsg.innerHTML = `<i class="fa-solid fa-microchip fa-spin"></i> Processing Game Data...`;
        let gCardsRaw = await fetchAllCards();

        let gCards = Array.isArray(gCardsRaw) ? gCardsRaw : [];
        let pCards = Array.isArray(pData.cards) ? pData.cards : [];
        let pSupport = Array.isArray(pData.supportCards) ? pData.supportCards : [];

        const existingIDs = new Set(gCards.map(c => c.id));
        pSupport.forEach(sc => { if (!existingIDs.has(sc.id)) { gCards.push({ id: sc.id, name: sc.name, rarity: sc.rarity }); existingIDs.add(sc.id); } });
        BACKUP_TOWERS.forEach(bt => { if (!existingIDs.has(bt.id)) { gCards.push(bt); existingIDs.add(bt.id); } });

        const pMap = {};
        [...pCards, ...pSupport].forEach(c => pMap[c.id] = c);

        let minAccountLevel = MAX_LEVEL;
        let spent = 0, rem = 0, maxedCount = 0, cardCollTotal = 0, cardReqTotal = 0;
        let missingByRarity = { "common": 0, "rare": 0, "epic": 0, "legendary": 0, "champion": 0 };
        let rarityStats = { "common": {gs:0, gr:0, cs:0, ct:0}, "rare": {gs:0, gr:0, cs:0, ct:0}, "epic": {gs:0, gr:0, cs:0, ct:0}, "legendary": {gs:0, gr:0, cs:0, ct:0}, "champion": {gs:0, gr:0, cs:0, ct:0} };
        let towerS = 0, towerR = 0, towerCS = 0, towerCT = 0;
        
        let levelCounts = Array(17).fill(0);
        
        // حساب الستار بوينت المصروفة
        let starPointsSpent = 0;
        [...pCards, ...pSupport].forEach(c => {
            if (c.starLevel) {
                if (c.starLevel >= 1) starPointsSpent += 10000;
                if (c.starLevel >= 2) starPointsSpent += 15000;
                if (c.starLevel >= 3) starPointsSpent += 20000;
            }
        });

        globalResults = gCards.map(gCard => {
            const pCard = pMap[gCard.id];
            const isOwned = !!pCard;
            let rarity = "common";
            if (RARITY_DB[gCard.id] || RARITY_DB[String(gCard.id)]) rarity = RARITY_DB[gCard.id] || RARITY_DB[String(gCard.id)];
            else if (CHAMPION_NAMES.includes(gCard.name)) rarity = "champion";
            else if (gCard.rarity) rarity = gCard.rarity.toLowerCase();

            const currentLvl = isOwned ? ((pCard.level || 0) + (START_LVL[rarity] - 1)) : 0;
            if (isOwned && currentLvl > 0 && currentLvl < minAccountLevel) minAccountLevel = currentLvl;
            if (isOwned && currentLvl > 0 && currentLvl <= 16) levelCounts[currentLvl]++;

            let goldSpent = 0, goldNeeded = 0, cardsInvested = 0, cardsTotalReq = 0, missingPerLevel = Array(MAX_LEVEL + 1).fill(0), tempStock = isOwned ? (pCard.count || 0) : 0;

            for (let l = START_LVL[rarity] + 1; l <= MAX_LEVEL; l++) {
              let cReq = CARD_LADDER[rarity] ? CARD_LADDER[rarity][l] || 0 : 0;
              cardsTotalReq += cReq;
              if (isOwned && l <= currentLvl) { goldSpent += GOLD_LADDER[l] || 0; cardsInvested += cReq; }
            }
            
            let cardsCollected = cardsInvested + tempStock;
            if(cardsCollected > cardsTotalReq) cardsCollected = cardsTotalReq; 

            const startCalc = isOwned ? currentLvl : (START_LVL[rarity] - 1);
            for (let targetLvl = startCalc + 1; targetLvl <= MAX_LEVEL; targetLvl++) {
              if (targetLvl > START_LVL[rarity]) goldNeeded += GOLD_LADDER[targetLvl] || 0;
              let req = CARD_LADDER[rarity] ? CARD_LADDER[rarity][targetLvl] || 0 : 0;
              if (tempStock >= req) tempStock -= req; else { missingPerLevel[targetLvl] = req - tempStock; tempStock = 0; }
            }

            const isTower = String(gCard.id).startsWith("15"); 
            let pctToMax = (cardsTotalReq > 0) ? (cardsCollected / cardsTotalReq) : 1;
            let pctToNext = 0; 
            if (currentLvl < MAX_LEVEL) {
               let nextReq = CARD_LADDER[rarity][currentLvl + 1] || 0;
               if (nextReq > 0) { pctToNext = Math.min(1, (isOwned ? (pCard.count || 0) : 0) / nextReq); }
            }

            spent += goldSpent; rem += goldNeeded; cardCollTotal += cardsCollected; cardReqTotal += cardsTotalReq;
            if(currentLvl === MAX_LEVEL) maxedCount++;
            let missingCards = cardsTotalReq - cardsCollected;
            if(missingCards > 0 && missingByRarity[rarity] !== undefined) missingByRarity[rarity] += missingCards;
            
            if(isTower) { towerS += goldSpent; towerR += goldNeeded; towerCS += cardsCollected; towerCT += cardsTotalReq; }
            if(rarityStats[rarity]) { rarityStats[rarity].gs += goldSpent; rarityStats[rarity].gr += goldNeeded; rarityStats[rarity].cs += cardsCollected; rarityStats[rarity].ct += cardsTotalReq; }

            return { id: gCard.id, cleanName: gCard.name || "Unknown", imgUrl: getCardImageUrl(gCard.name), rarity: rarity, rarityKey: rarity, actualLvl: currentLvl, status: isOwned ? currentLvl : "Not Owned", stock: isOwned ? (pCard.count || 0) : 0, spent: goldSpent, rem: goldNeeded, missingLevels: missingPerLevel, isTower: isTower, pctToMax: pctToMax, pctToNext: pctToNext };
        });

        globalMinLevel = minAccountLevel;
        const totalGold = spent + rem;
        const unownedCount = globalResults.filter(r => r.status === "Not Owned").length;

        document.getElementById("playerGreeting").innerHTML = `<i class="fa-solid fa-user-astronaut" style="color: var(--accent-blue);"></i> WELCOME, <span style="color:var(--text-main);">${pData.name}</span>`;

        let daysPlayedRaw = 0;
        if(pData && pData.badges) { const badge = pData.badges.find(b => b.name === "YearsPlayed"); if(badge) daysPlayedRaw = badge.progress; }
        const today = new Date(); const creationDate = new Date(today.getTime() - (daysPlayedRaw * 24 * 60 * 60 * 1000));
        let years = today.getFullYear() - creationDate.getFullYear(); let months = today.getMonth() - creationDate.getMonth(); let days = today.getDate() - creationDate.getDate();
        if (days < 0) { months--; const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0); days += prevMonthDate.getDate(); }
        if (months < 0) { years--; months += 12; }

        let currentExpLvl = pData.expLevel || 1, currentExpPoints = pData.expPoints || 0, isMaxLevelKing = (currentExpLvl >= 90);
        let totalXpOverall = 0, playerTotalXp = 0;
        for (let i = 1; i < 90; i++) { let lvlXp = XP_LADDER[i] || 0; totalXpOverall += lvlXp; if (i < currentExpLvl) playerTotalXp += lvlXp; }
        playerTotalXp += currentExpPoints; if (playerTotalXp > totalXpOverall) playerTotalXp = totalXpOverall;
        let totalXpToMax = totalXpOverall - playerTotalXp, nextLvlReq = isMaxLevelKing ? 0 : (XP_LADDER[currentExpLvl] || 0), xpNeededForNext = nextLvlReq - currentExpPoints;

        // حساب نسبة تقدم شريط الـ XP
        let xpPct = isMaxLevelKing ? 100 : (currentExpPoints / nextLvlReq) * 100;

        let ownedCards = globalResults.filter(r => r.status !== "Not Owned" && r.actualLvl < MAX_LEVEL);
        let lowestLvl = MAX_LEVEL; ownedCards.forEach(c => { if(c.actualLvl < lowestLvl) lowestLvl = c.actualLvl; });
        let countLowest = ownedCards.filter(c => c.actualLvl === lowestLvl).length;
        let targetLvlForLowest = lowestLvl + 1, xpPerUpgrade = UPGRADE_XP_REWARD[targetLvlForLowest] || 0, totalXpGain = xpPerUpgrade * countLowest, totalGoldCostForMass = GOLD_LADDER[targetLvlForLowest] * countLowest;
        let simulatedExpPoints = currentExpPoints + totalXpGain, simulatedLevel = currentExpLvl;
        while (simulatedLevel < 90 && simulatedExpPoints >= XP_LADDER[simulatedLevel]) { simulatedExpPoints -= XP_LADDER[simulatedLevel]; simulatedLevel++; }
        let remAfterSim = Math.max(0, totalXpToMax - totalXpGain);

        let ladderXP = 0, ladderStrArr = [], xpNeededA = xpNeededForNext, lvlCounts = Array(MAX_LEVEL + 1).fill(0);
        ownedCards.forEach(c => { if(c.actualLvl < MAX_LEVEL) lvlCounts[c.actualLvl]++; });
        for (let l = 1; l < MAX_LEVEL; l++) {
            if (lvlCounts[l] > 0) {
                let xpPer = UPGRADE_XP_REWARD[l + 1] || 0; if (xpPer <= 0) continue;
                let neededCards = Math.ceil(xpNeededA / xpPer), cardsToUse = Math.min(lvlCounts[l], neededCards);
                if(cardsToUse > 0) { ladderXP += cardsToUse * xpPer; xpNeededA -= cardsToUse * xpPer; ladderStrArr.push(`${cardsToUse} to Lvl ${l + 1}`); }
                if (xpNeededA <= 0) break;
            }
        }
        let ladderPlanStr = isMaxLevelKing ? "Maxed!" : (ladderXP >= xpNeededForNext ? ladderStrArr.join(", ") : ladderStrArr.join(", ") + " (Need More)");

        let readyCards = ownedCards.filter(c => { let nextReq = CARD_LADDER[c.rarityKey][c.actualLvl + 1]; return nextReq > 0 && c.stock >= nextReq; });
        readyCards.forEach(c => { c.nextXp = UPGRADE_XP_REWARD[c.actualLvl + 1] || 0; c.nextGold = GOLD_LADDER[c.actualLvl + 1] || 0; c.efficiency = c.nextGold > 0 ? (c.nextXp / c.nextGold) : 0; });
        readyCards.sort((a, b) => b.efficiency - a.efficiency); 
        let instantXP = 0, instantGold = 0, instantNames = [], xpNeededB = xpNeededForNext;
        for (let c of readyCards) { if (xpNeededB <= 0) break; instantXP += c.nextXp; instantGold += c.nextGold; instantNames.push(`${c.cleanName}(${c.actualLvl + 1})`); xpNeededB -= c.nextXp; }
        let instantPlanStr = isMaxLevelKing ? "Maxed!" : (instantXP >= xpNeededForNext ? (instantNames.length > 2 ? `${instantNames.slice(0, 2).join(", ")} +${instantNames.length - 2} more (${(instantGold/1000).toFixed(1)}k Gold)` : `${instantNames.join(", ")} (${(instantGold/1000).toFixed(1)}k Gold)`) : (instantXP > 0 ? `All ready give ${instantXP}XP. Not enough.` : "No ready cards."));

        // حساب الفوز والخسارة
        let wins = pData.wins || 0;
        let losses = pData.losses || 0;
        let draws = Math.max(0, (pData.battleCount || 0) - wins - losses);
        
        // تنسيق الستار بوينت الماكس
        let spAmount = pData.starPoints || 0;
        let isSpMax = spAmount === 5000000;
        let spDisplay = spAmount.toLocaleString() + (isSpMax ? ` <span class="star-max-badge">MAX <i class="fa-solid fa-check"></i></span>` : '');

        // UI Updates (مع شريط الـ XP الأنيق)
        document.getElementById("legacyData").innerHTML = `
        <h3 style="color:var(--text-muted);"><i class="fa-solid fa-id-card"></i> Account Profile</h3>
        <div class="cr-xp-wrapper">
            <div class="cr-xp-fill" style="width: ${xpPct}%;"></div>
            <div class="cr-xp-text">${isMaxLevelKing ? 'MAX LEVEL' : currentExpPoints.toLocaleString() + ' / ' + nextLvlReq.toLocaleString()}</div>
            <div class="cr-xp-level"><span>${currentExpLvl}</span></div>
        </div>
        <div style="display: flex; justify-content: space-around; text-align: center; margin-top: 15px; background: rgba(0,0,0,0.2); border-radius:8px; padding:15px 5px;">
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${years}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">YEARS</span></div>
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${String(months).padStart(2, '0')}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">MONTHS</span></div>
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${String(days).padStart(2, '0')}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">DAYS</span></div>
        </div>`;
        
        document.getElementById("financialBox").innerHTML = `<h3><i class="fa-solid fa-coins" style="color:var(--accent-gold)"></i> Financial Status</h3>
        <table class="info-table"><tr><td>Invested</td><td style="text-align:right;" class="green-text">${spent.toLocaleString()}</td><td style="text-align:right;">${(spent/totalGold*100).toFixed(1)}%</td></tr>
        <tr><td>Remaining</td><td style="text-align:right;" class="red-text">${rem.toLocaleString()}</td><td style="text-align:right;">${(rem/totalGold*100).toFixed(1)}%</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td><strong style="color:var(--text-main);">TOTAL</strong></td><td style="text-align:right;" class="gold-text">${totalGold.toLocaleString()}</td><td style="text-align:right;">100%</td></tr></table>`;
        
        document.getElementById("collectionBox").innerHTML = `<h3><i class="fa-solid fa-layer-group" style="color:var(--accent-blue)"></i> Card Collection</h3>
        <table class="info-table"><tr><td>Collected</td><td style="text-align:right;" class="green-text">${cardCollTotal.toLocaleString()}</td><td style="text-align:right;">${(cardCollTotal/cardReqTotal*100).toFixed(1)}%</td></tr>
        <tr><td>Missing</td><td style="text-align:right;" class="red-text">${(cardReqTotal - cardCollTotal).toLocaleString()}</td><td style="text-align:right;">${((cardReqTotal - cardCollTotal)/cardReqTotal*100).toFixed(1)}%</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td><strong style="color:var(--text-main);">TOTAL</strong></td><td style="text-align:right; color:var(--text-main); font-weight:bold;">${cardReqTotal.toLocaleString()}</td><td style="text-align:right;">100%</td></tr></table>`;
        
        document.getElementById("playerBox").innerHTML = `<h3><i class="fa-solid fa-chart-simple" style="color:var(--accent-purple)"></i> Player Stats</h3>
        <table class="info-table">
        <tr><td>Star Points</td><td style="text-align:right;" class="gold-text">${spDisplay}</td></tr>
        <tr><td>SP Spent</td><td style="text-align:right;" class="blue-text">${starPointsSpent.toLocaleString()}</td></tr>
        <tr><td>Maxed Cards</td><td style="text-align:right;" class="green-text">${maxedCount} / ${globalResults.length}</td></tr>
        <tr><td>Unowned</td><td style="text-align:right;" class="red-text">${unownedCount}</td></tr>
        </table>`;

        let bdHTML = `<h3><i class="fa-solid fa-chart-pie"></i> Rarity Breakdown</h3>
        <table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">RARITY</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">INV GOLD</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">REM GOLD</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">CARDS</th></tr>`;
        const addRow = (label, obj) => { bdHTML += `<tr><td style="color:var(--text-main);">${label}</td><td style="text-align:right;">${obj.gs.toLocaleString()}</td><td style="text-align:right;">${obj.gr.toLocaleString()}</td><td style="text-align:right;">${(obj.cs/obj.ct*100).toFixed(1)}%</td></tr>`; };
        addRow("Common", rarityStats.common); addRow("Rare", rarityStats.rare); addRow("Epic", rarityStats.epic); addRow("Legendary", rarityStats.legendary); addRow("Champion", rarityStats.champion);
        bdHTML += `<tr style="border-top: 1px solid var(--border-color);"><td style="color:var(--accent-red); font-weight:bold;">Towers</td><td style="text-align:right; font-weight:bold;">${towerS.toLocaleString()}</td><td style="text-align:right; font-weight:bold;">${towerR.toLocaleString()}</td><td style="text-align:right; font-weight:bold;">${(towerCS/towerCT*100).toFixed(1)}%</td></tr></table>`;
        document.getElementById("breakdownData").innerHTML = bdHTML;

        document.getElementById("strategyData").innerHTML = `<table class="info-table">
        <tr><td>Lowest Level</td><td style="text-align:right;" class="gold-text">${lowestLvl}</td><td style="text-align:right;">(x${countLowest})</td></tr>
        <tr><td>Target Lvl</td><td style="text-align:right;" class="gold-text">${targetLvlForLowest}</td><td style="text-align:right;"></td></tr>
        <tr><td>XP Gained</td><td style="text-align:right;" class="green-text">+${totalXpGain.toLocaleString()}</td><td style="text-align:right;"></td></tr>
        <tr><td>Total Cost</td><td style="text-align:right;" class="red-text">-${totalGoldCostForMass.toLocaleString()}</td><td style="text-align:right;"></td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td>Simulated King</td><td style="text-align:right;" class="gold-text">Lvl ${simulatedLevel}</td><td style="text-align:right;"></td></tr></table>`;
        
        document.getElementById("ladderPlanText").innerText = ladderPlanStr;
        document.getElementById("instantPlanText").innerText = instantPlanStr;

        let upgradable = globalResults.filter(r => r.actualLvl < MAX_LEVEL && r.status !== "Not Owned");
        upgradable.sort((a, b) => b.pctToNext - a.pctToNext);
        let upHTML = `
            <h3 style="color:var(--accent-green);"><i class="fa-solid fa-arrow-trend-up"></i> Top Upgrades 
                <div class="tooltip-container"><i class="fa-solid fa-circle-info tooltip-icon"></i><span class="tooltip-text">Closest cards to having enough copies for next level.</span></div>
            </h3>
            <table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">CARD</th><th style="text-align:center; color:var(--text-muted); font-size:10px;">LVL</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">PROG</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">COST</th></tr>`;
        for(let i=0; i<3; i++) {
            if(upgradable[i]) { 
                let next = upgradable[i].actualLvl + 1; 
                upHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${upgradable[i].imgUrl}" class="card-img" style="width:24px; height:28px;" onerror="this.style.display='none'"> <span>${upgradable[i].cleanName}</span></td><td style="text-align:center;">${next}</td><td style="text-align:right;">${getProgressBar(upgradable[i].pctToNext, '#22c55e')}</td><td style="text-align:right;" class="gold-text">${(GOLD_LADDER[next]/1000).toFixed(0)}k</td></tr>`; 
            } else { upHTML += `<tr><td>-</td><td style="text-align:center;">-</td><td style="text-align:right;">-</td><td style="text-align:right;">-</td></tr>`; }
        }
        document.getElementById("topUpgradesData").innerHTML = upHTML + `</table>`;

        let deckIDs = new Set();
        if(pData.currentDeck) pData.currentDeck.forEach(c => deckIDs.add(c.id));
        if(pData.currentDeckSupportCards) pData.currentDeckSupportCards.forEach(c => deckIDs.add(c.id));

        let myDeckCards = globalResults.filter(r => deckIDs.has(r.id));
        let deckGoldNeeded = 0;
        myDeckCards.forEach(c => deckGoldNeeded += c.rem);
        
        const isEpicSundayDeck = (new Date().getDay() === 0);
        let permittedDeckRarities = isEpicSundayDeck ? ["common", "rare", "epic"] : ["common", "rare"];

        let deckPriority = myDeckCards.filter(c => 
            c.actualLvl < MAX_LEVEL && permittedDeckRarities.includes(c.rarityKey) && c.pctToNext < 1
        ).sort((a,b) => {
            if (isEpicSundayDeck) {
                if (a.rarityKey === 'epic' && b.rarityKey !== 'epic') return -1;
                if (b.rarityKey === 'epic' && a.rarityKey !== 'epic') return 1;
            }
            if (a.actualLvl !== b.actualLvl) return a.actualLvl - b.actualLvl;
            return b.pctToNext - a.pctToNext;
        });
        
        let deckHTML = `<table class="info-table"><tr><td>Gold to Max Deck</td><td style="text-align:right;" class="red-text">${deckGoldNeeded.toLocaleString()}</td><td style="text-align:right;"></td></tr></table>`;
        deckHTML += `<div style="margin-top:15px; display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">`;
        myDeckCards.forEach(c => {
            let borderColor = c.actualLvl === MAX_LEVEL ? "var(--accent-purple)" : "var(--border-color)";
            let lvlColor = c.actualLvl === MAX_LEVEL ? "color: transparent; background: linear-gradient(90deg, #fbcfe8, #d946ef); -webkit-background-clip: text; background-clip: text; font-weight:800;" : "color: var(--text-main);";            deckHTML += `<div style="border:1px solid ${borderColor}; padding:8px 5px; border-radius:8px; text-align:center; width:65px; background: rgba(0,0,0,0.2);">
                <img src="${c.imgUrl}" style="width:35px; height:42px; object-fit:contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));"><br>
                <span style="font-size:11px; font-weight:600; ${lvlColor}">Lvl ${c.actualLvl}</span>
            </div>`;
        });
        deckHTML += `</div>`;
        document.getElementById("deckData").innerHTML = deckHTML;

        let deckAdvisorBox = document.getElementById("deckAdvisorData");
        deckAdvisorBox.className = isEpicSundayDeck ? "info-box epic-sunday-glow" : "info-box";
        let daTitleColor = isEpicSundayDeck ? 'var(--accent-purple)' : 'var(--accent-red)';
        let daHTML = `<h3 style="color:${daTitleColor};"><i class="fa-solid fa-crosshairs"></i> Deck Advisor <div class="tooltip-container"><i class="fa-solid fa-circle-info tooltip-icon"></i><span class="tooltip-text">Clan request priority. Respects Epic Sunday!</span></div></h3>`;
        if (isEpicSundayDeck) daHTML += `<div class="epic-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Epic Sunday: Prioritizing Epic Cards!</div>`;
        daHTML += `<table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">CARD</th><th style="text-align:center; color:var(--text-muted); font-size:10px;">LVL</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">NEEDED</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">READY %</th></tr>`;
        for(let i=0; i<3; i++) {
             if(deckPriority[i]) {
                 daHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${deckPriority[i].imgUrl}" class="card-img" style="width:24px; height:28px;"> <span>${deckPriority[i].cleanName}</span></td>
                 <td style="text-align:center;">${deckPriority[i].actualLvl}</td>
                 <td style="text-align:right;" class="gold-text">${deckPriority[i].rem > 0 ? (deckPriority[i].rem/1000).toFixed(0)+'k' : 'Cards'}</td>
                 <td style="text-align:right; width:80px;">${getProgressBar(deckPriority[i].pctToNext, '#3b82f6')}</td></tr>`;
             } else {
                 daHTML += `<tr><td style="color:var(--text-muted)">-</td><td style="text-align:center; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">MAXED</td></tr>`;
             }
        }
        deckAdvisorBox.innerHTML = daHTML + `</table>`;

        const isEpicSunday = (new Date().getDay() === 0);
        const getScore = (r) => { let next = r.actualLvl + 1; if (next > MAX_LEVEL) return 0; let req = CARD_LADDER[r.rarityKey][next]; return req ? (r.stock / req) : 0; };
        let permittedRarities = isEpicSunday ? ["common", "rare", "epic"] : ["common", "rare"];
        let targetLevel = lowestLvl; let reqList = [];
        for (let l = lowestLvl; l < MAX_LEVEL; l++) {
            let potentialCards = globalResults.filter(r => r.status !== "Not Owned" && r.actualLvl === l && permittedRarities.includes(r.rarityKey) && getScore(r) < 1);
            if (potentialCards.length > 0) {
                targetLevel = l;
                potentialCards.sort((a, b) => getScore(b) - getScore(a));
                if (isEpicSunday) { let sundayEpic = potentialCards.find(r => r.rarityKey === "epic"); if (sundayEpic) { reqList.push(sundayEpic); potentialCards = potentialCards.filter(r => r.id !== sundayEpic.id); } }
                while(reqList.length < 3 && potentialCards.length > 0) { reqList.push(potentialCards.shift()); }
                break; 
            }
        }
        
        let accountAdvisorBox = document.getElementById("advisorData");
        accountAdvisorBox.className = isEpicSunday ? "info-box epic-sunday-glow" : "info-box";
        let titleColor = isEpicSunday ? 'var(--accent-purple)' : 'var(--accent-blue)';
        let advHTML = `<h3 style="color:${titleColor};"><i class="fa-solid fa-lightbulb"></i> Account Advisor <div class="tooltip-container"><i class="fa-solid fa-circle-info tooltip-icon"></i><span class="tooltip-text">Finds lowest level cards needing copies from clan.</span></div></h3>`;
        if (isEpicSunday) advHTML += `<div class="epic-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Epic Sunday: Prioritizing Epic Cards!</div>`;
        advHTML += `<table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">CARD</th><th style="text-align:center; color:var(--text-muted); font-size:10px;">LVL</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">STOCK</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">READY %</th></tr>`;
        for(let i=0; i<3; i++) {
            if(reqList[i]) { 
                advHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${reqList[i].imgUrl}" class="card-img" style="width:24px; height:28px;" onerror="this.style.display='none'"> <span>${reqList[i].cleanName}</span></td>
                <td style="text-align:center;">${reqList[i].actualLvl}</td>
                <td style="text-align:right;">${reqList[i].stock}</td>
                <td style="text-align:right; width:80px;">${getProgressBar(getScore(reqList[i]), '#3b82f6')}</td></tr>`; 
            } else { 
                advHTML += `<tr><td style="color:var(--text-muted)">-</td><td style="text-align:center; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">READY</td></tr>`; 
            }
        }
        accountAdvisorBox.innerHTML = advHTML + `</table>`;

        // Charts update
        if(chartWinLoss) chartWinLoss.destroy();
        chartWinLoss = new Chart(document.getElementById('winLossChart'), { type: 'doughnut', data: { labels: ['Wins', 'Losses', 'Draws'], datasets: [{ data: [wins, losses, draws], backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Battle Performance', color: '#f4f4f5' }, legend: { display: false } }, cutout: '65%' } });
        
        let labelsLevel = []; let dataLevel = [];
        for (let i = 1; i <= 16; i++) { if (i >= Math.min(globalMinLevel, 10) || levelCounts[i] > 0) { labelsLevel.push("Lvl " + i); dataLevel.push(levelCounts[i]); } }
        if(chartLevels) chartLevels.destroy();
        chartLevels = new Chart(document.getElementById('levelChart'), { type: 'bar', data: { labels: labelsLevel, datasets: [{ label: 'Cards', data: dataLevel, backgroundColor: '#3b82f6', borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } }, x: { ticks: { color: '#a1a1aa' }, grid: { display: false } } } } });

        if(chartGold) chartGold.destroy();
        chartGold = new Chart(document.getElementById('goldChart'), { type: 'pie', data: { labels: ['Invested Gold', 'Remaining Gold'], datasets: [{ data: [spent, rem], backgroundColor: ['#facc15', '#27272a'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Gold Progress', color: '#f4f4f5' }, legend: { display: false } } } });
        
        if(chartCards) chartCards.destroy();
        chartCards = new Chart(document.getElementById('cardsChart'), { type: 'doughnut', data: { labels: ['Collected', 'Miss Common', 'Miss Rare', 'Miss Epic', 'Miss Leg.', 'Miss Champ.'], datasets: [{ data: [cardCollTotal, missingByRarity.common, missingByRarity.rare, missingByRarity.epic, missingByRarity.legendary, missingByRarity.champion], backgroundColor: ['#3b82f6', '#94a3b8', '#f97316', '#a855f7', '#06b6d4', '#facc15'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Card Collection', color: '#f4f4f5' }, legend: { display: false } }, cutout: '65%' } });
        
        if(chartXp) chartXp.destroy();
        chartXp = new Chart(document.getElementById('xpChart'), { type: 'doughnut', data: { labels: ['Earned XP', 'Remaining XP'], datasets: [{ data: [playerTotalXp, totalXpToMax], backgroundColor: ['#a855f7', '#27272a'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: "King's Journey", color: '#f4f4f5' }, legend: { display: false } }, cutout: '65%' } });

        renderMainTable();
        statusMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Analysis Complete!`;
        statusMsg.style.color = "var(--accent-green)";
        dash.style.opacity = "1"; 
        openTab('overview'); 
    } catch (error) {
        console.error(error);
        statusMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error: ` + error.message;
        statusMsg.style.color = "var(--accent-red)";
        dash.classList.add("hidden"); 
    }
}

function renderMainTable() {
    let filteredResults = globalResults.filter(r => {
        if (currentActiveFilter === 'all') return true;
        if (currentActiveFilter === 'tower') return r.isTower;
        return r.rarityKey === currentActiveFilter;
    });

    filteredResults.sort((a, b) => {
        if (a.isTower !== b.isTower) return b.isTower - a.isTower;
        if (a.isTower && b.isTower) {
            let aOwned = a.status !== "Not Owned" ? 1 : 0; let bOwned = b.status !== "Not Owned" ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned; 
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];
        } else {
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];
            let aOwned = a.status !== "Not Owned" ? 1 : 0; let bOwned = b.status !== "Not Owned" ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned; 
        }
        let aMaxed = (a.actualLvl === MAX_LEVEL) ? 1 : 0; let bMaxed = (b.actualLvl === MAX_LEVEL) ? 1 : 0;
        if (aMaxed !== bMaxed) return bMaxed - aMaxed;
        if (b.pctToNext !== a.pctToNext) return b.pctToNext - a.pctToNext;
        return b.actualLvl - a.actualLvl;
    });

    const startTargetLvl = Math.min(globalMinLevel + 1, MAX_LEVEL);
    let tableHTML = `<thead><tr><th style="text-align:left;">Card Name</th><th>Rarity</th><th>Level</th><th>Stock</th><th style="min-width:100px;">% Next</th><th style="min-width:100px;">% Max</th>`;
    for (let i = startTargetLvl; i <= MAX_LEVEL; i++) tableHTML += `<th>To Lvl ${i}</th>`;
    tableHTML += `<th>Gold Spent</th><th>Gold Rem</th></tr></thead><tbody>`;

    let currentCategoryKey = ""; 
    let colSpanCount = 8 + (MAX_LEVEL - startTargetLvl + 1);
    let hasTowersInCurrentFilter = filteredResults.some(r => r.isTower);

    filteredResults.forEach(r => {
        let newCategoryKey = ""; let shouldPrintLabel = false; let labelText = ""; let labelColor = "var(--text-main)";

        if (currentActiveFilter === 'all') {
            newCategoryKey = r.isTower ? "all_towers" : r.rarityKey;
            if (newCategoryKey !== currentCategoryKey) {
                shouldPrintLabel = true;
                if (newCategoryKey === "all_towers") { labelText = "TOWER TROOPS"; labelColor = "var(--accent-red)"; }
                else if (r.rarityKey === "champion") { labelText = "CHAMPIONS"; labelColor = "var(--accent-gold)"; }
                else if (r.rarityKey === "legendary") { labelText = "LEGENDARY"; labelColor = "#00cec9"; }
                else if (r.rarityKey === "epic") { labelText = "EPIC"; labelColor = "var(--accent-purple)"; }
                else if (r.rarityKey === "rare") { labelText = "RARE"; labelColor = "#e67e22"; }
                else if (r.rarityKey === "common") { labelText = "COMMON"; labelColor = "#bdc3c7"; }
            }
        } else if (currentActiveFilter === 'tower') { shouldPrintLabel = false; } 
        else {
            newCategoryKey = r.isTower ? `tower_${r.rarityKey}` : `troop_${r.rarityKey}`;
            if (newCategoryKey !== currentCategoryKey && hasTowersInCurrentFilter) {
                shouldPrintLabel = true; let rarityDisplay = r.rarity.toUpperCase();
                labelText = r.isTower ? `${rarityDisplay} TOWERS` : `${rarityDisplay} TROOPS & SPELLS`;
                if (r.rarityKey === "champion") labelColor = "var(--accent-gold)";
                else if (r.rarityKey === "legendary") labelColor = "#00cec9";
                else if (r.rarityKey === "epic") labelColor = "var(--accent-purple)";
                else if (r.rarityKey === "rare") labelColor = "#e67e22";
                else if (r.rarityKey === "common") labelColor = "#bdc3c7";
                if (r.isTower) labelColor = "var(--accent-red)"; 
            }
        }

        if (shouldPrintLabel && labelText !== "") { tableHTML += `<tr class="table-separator"><td colspan="${colSpanCount}" style="border-left: 4px solid ${labelColor};"><i class="fa-solid fa-layer-group" style="margin-right:8px;"></i> ${labelText}</td></tr>`; currentCategoryKey = newCategoryKey; } 
        else if (currentActiveFilter !== 'all') { currentCategoryKey = newCategoryKey; }

        let isElite = (r.actualLvl === MAX_LEVEL);
        let rowClass = isElite ? "class='elite-max-row'" : "";
        let nameStyle = isElite ? "class='elite-text'" : "";
        let rarityColor = r.rarityKey==='epic' ? 'var(--accent-purple)' : r.rarityKey==='legendary' ? '#00cec9' : r.rarityKey==='champion' ? 'var(--accent-gold)' : r.rarityKey==='rare' ? '#e67e22' : '#bdc3c7';
        let isLockedClass = (r.status === "Not Owned") ? "locked-card" : "";
        
        // أشرطة التحميل الملونة
        let displayPctNext = r.status === "Not Owned" ? "-" : getProgressBar(r.pctToNext, r.pctToNext >= 1 ? '#22c55e' : '#3b82f6');
        let displayPctMax = r.status === "Not Owned" ? "-" : getProgressBar(r.pctToMax, isElite ? '#d946ef' : '#facc15');

        tableHTML += `<tr ${rowClass} data-rarity="${r.rarityKey}" data-istower="${r.isTower}">
            <td class="card-cell ${isLockedClass}"><img src="${r.imgUrl}" class="card-img" onerror="this.style.display='none'"> <span ${nameStyle}>${r.cleanName}</span></td>
            <td style="text-transform: capitalize; color: ${rarityColor}; font-weight:700;" class="${isLockedClass}">${r.rarity}</td>
            <td class="${isLockedClass}" ${isElite ? "style='font-weight:900;'" : ""}>${r.status}</td>
            <td class="${isLockedClass}">${r.stock.toLocaleString()}</td>
            <td class="${isLockedClass}">${displayPctNext}</td>
            <td class="${isLockedClass}">${displayPctMax}</td>`;
        for (let i = startTargetLvl; i <= MAX_LEVEL; i++) {
            let missing = r.missingLevels[i] || 0;
            if (r.actualLvl >= i) tableHTML += `<td style="color:var(--border-color)" class="${isLockedClass}">-</td>`;
            else if (missing === 0) tableHTML += `<td class="${isLockedClass}"><i class="fa-solid fa-check" style="color:var(--accent-green)"></i></td>`;
            else tableHTML += `<td class="red-text ${isLockedClass}">${missing.toLocaleString()}</td>`;
        }
        tableHTML += `<td class="green-text ${isLockedClass}">${r.spent.toLocaleString()}</td><td class="gold-text ${isLockedClass}">${r.rem.toLocaleString()}</td></tr>`;
    });
    tableHTML += `</tbody>`;
    document.getElementById("mainDataTable").innerHTML = tableHTML;
}
