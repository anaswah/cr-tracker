/**
 * Clash Royale Web Engine v23.5 - Mobile Ready Edition
 * Engineered for M7amd 3naswah
 */

const PROXY_BASE = "https://Anaswah20011.pythonanywhere.com";

const GOLD_LADDER = [0, 0, 5, 20, 50, 150, 400, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 120000];
const MAX_LEVEL = GOLD_LADDER.length - 1;

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

let chartGold, chartCards, chartXp;
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
    if (!document.getElementById("playerTag").value) {
        document.getElementById("playerTag").value = history.length > 0 ? history[0] : "2RG9P9Y";
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

async function startAnalysis() {
    let rawTag = document.getElementById("playerTag").value.trim().toUpperCase();
    let tag = rawTag.startsWith("#") ? rawTag.substring(1) : rawTag;
    let statusMsg = document.getElementById("statusMessage");
    let dash = document.getElementById("dashboard");

    if (!tag) { statusMsg.innerText = "Please enter a valid Player Tag!"; return; }

    saveTagToHistory(tag);
    statusMsg.innerText = "⏳ Connecting to Supercell Servers...";
    statusMsg.style.color = "#f39c12";
    dash.classList.remove("hidden"); 
    dash.style.opacity = "0.5"; 

    try {
        let pRes = await fetch(`${PROXY_BASE}/player?tag=${tag}`);
        if (!pRes.ok) throw new Error(`Player not found or Server error (${pRes.status})`);
        let pData = await pRes.json();
        
        statusMsg.innerText = "⏳ Processing Game Data...";
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
        
        globalResults = gCards.map(gCard => {
            const pCard = pMap[gCard.id];
            const isOwned = !!pCard;
            let rarity = "common";
            if (RARITY_DB[gCard.id] || RARITY_DB[String(gCard.id)]) rarity = RARITY_DB[gCard.id] || RARITY_DB[String(gCard.id)];
            else if (CHAMPION_NAMES.includes(gCard.name)) rarity = "champion";
            else if (gCard.rarity) rarity = gCard.rarity.toLowerCase();

            const currentLvl = isOwned ? ((pCard.level || 0) + (START_LVL[rarity] - 1)) : 0;
            if (isOwned && currentLvl > 0 && currentLvl < minAccountLevel) minAccountLevel = currentLvl;

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

        document.getElementById("playerGreeting").innerText = `👑 WELCOME, ${pData.name}`;

        let daysPlayedRaw = 0;
        if(pData && pData.badges) { const badge = pData.badges.find(b => b.name === "YearsPlayed"); if(badge) daysPlayedRaw = badge.progress; }
        const today = new Date(); const creationDate = new Date(today.getTime() - (daysPlayedRaw * 24 * 60 * 60 * 1000));
        let years = today.getFullYear() - creationDate.getFullYear(); let months = today.getMonth() - creationDate.getMonth(); let days = today.getDate() - creationDate.getDate();
        if (days < 0) { months--; const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0); days += prevMonthDate.getDate(); }
        if (months < 0) { years--; months += 12; }
        
        let veteranTitle = years >= 10 ? "🧙‍♂️ GRAND ELDER" : years >= 7 ? "🎖️ WAR VETERAN" : years >= 4 ? "⚔️ BATTLE HARDENED" : "🛡️ KNIGHT";

        let currentExpLvl = pData.expLevel || 1, currentExpPoints = pData.expPoints || 0, isMaxLevelKing = (currentExpLvl >= 90);
        let totalXpOverall = 0, playerTotalXp = 0;
        for (let i = 1; i < 90; i++) { let lvlXp = XP_LADDER[i] || 0; totalXpOverall += lvlXp; if (i < currentExpLvl) playerTotalXp += lvlXp; }
        playerTotalXp += currentExpPoints; if (playerTotalXp > totalXpOverall) playerTotalXp = totalXpOverall;
        let totalXpToMax = totalXpOverall - playerTotalXp, nextLvlReq = isMaxLevelKing ? 0 : (XP_LADDER[currentExpLvl] || 0), xpNeededForNext = nextLvlReq - currentExpPoints;

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

        document.getElementById("legacyData").innerHTML = `<div style="display: flex; justify-content: space-around; font-family: monospace; font-size: 20px;"><div><span style="color:#2ecc71">${years}</span><br><span style="font-size:12px;color:#aaa">YEARS</span></div><div><span style="color:#2ecc71">${String(months).padStart(2, '0')}</span><br><span style="font-size:12px;color:#aaa">MONTHS</span></div><div><span style="color:#2ecc71">${String(days).padStart(2, '0')}</span><br><span style="font-size:12px;color:#aaa">DAYS</span></div><div><span style="color:#9b59b6">${currentExpLvl}</span><br><span style="font-size:12px;color:#aaa">KING LVL</span></div></div><h3 style="color: #f1c40f; text-align: center; margin-top: 15px;">${veteranTitle}</h3>`;
        document.getElementById("financialBox").innerHTML = `<h3 style="text-align:center; color:#e74c3c; margin-bottom:10px;">💰 FINANCIAL STATUS</h3><table class="info-table"><tr><td>Invested</td><td class="green-text">${spent.toLocaleString()}</td><td>${(spent/totalGold*100).toFixed(1)}%</td></tr><tr><td>Remaining</td><td class="red-text">${rem.toLocaleString()}</td><td>${(rem/totalGold*100).toFixed(1)}%</td></tr><tr style="background:#111; font-weight:bold;"><td>TOTAL</td><td class="gold-text">${totalGold.toLocaleString()}</td><td>100%</td></tr></table>`;
        document.getElementById("collectionBox").innerHTML = `<h3 style="text-align:center; color:#3498db; margin-bottom:10px;">📦 CARD COLLECTION</h3><table class="info-table"><tr><td>Collected</td><td class="green-text">${cardCollTotal.toLocaleString()}</td><td>${(cardCollTotal/cardReqTotal*100).toFixed(1)}%</td></tr><tr><td>Missing</td><td class="red-text">${(cardReqTotal - cardCollTotal).toLocaleString()}</td><td>${((cardReqTotal - cardCollTotal)/cardReqTotal*100).toFixed(1)}%</td></tr><tr style="background:#111; font-weight:bold;"><td>TOTAL</td><td style="color:#fff">${cardReqTotal.toLocaleString()}</td><td>100%</td></tr></table>`;
        document.getElementById("playerBox").innerHTML = `<h3 style="text-align:center; color:#f39c12; margin-bottom:10px;">🌟 PLAYER STATS</h3><table class="info-table"><tr><td>Star Points</td><td class="gold-text">${(pData.starPoints||0).toLocaleString()}</td><td>${(pData.starPoints||0)>=5000000?'⭐':''}</td></tr><tr><td>Maxed Cards</td><td class="green-text">${maxedCount}</td><td>/ ${globalResults.length}</td></tr><tr><td>Unowned</td><td class="red-text">${unownedCount}</td><td>${unownedCount===0?'✅':''}</td></tr></table>`;

        let bdHTML = `<h3 style="text-align:center; margin-bottom:10px;">📊 RARITY BREAKDOWN</h3><table class="info-table"><tr><th>Rarity</th><th>Inv Gold</th><th>Rem Gold</th><th>Cards Coll</th><th>Cards %</th></tr>`;
        const addRow = (label, obj) => { bdHTML += `<tr><td>${label}</td><td>${obj.gs.toLocaleString()}</td><td>${obj.gr.toLocaleString()}</td><td>${obj.cs.toLocaleString()}</td><td>${(obj.cs/obj.ct*100).toFixed(1)}%</td></tr>`; };
        addRow("Common", rarityStats.common); addRow("Rare", rarityStats.rare); addRow("Epic", rarityStats.epic); addRow("Legendary", rarityStats.legendary); addRow("Champion", rarityStats.champion);
        bdHTML += `<tr style="font-weight:bold; background:#111;"><td>Towers</td><td>${towerS.toLocaleString()}</td><td>${towerR.toLocaleString()}</td><td>${towerCS.toLocaleString()}</td><td>${(towerCS/towerCT*100).toFixed(1)}%</td></tr></table>`;
        document.getElementById("breakdownData").innerHTML = bdHTML;

        document.getElementById("strategyData").innerHTML = `<table class="info-table" style="margin-bottom: 15px;"><tr><td style="background:#111;">Lowest Level</td><td class="gold-text">${lowestLvl}</td><td style="background:#111;">Cards at this Lvl</td><td class="green-text">${countLowest}</td><td style="background:#111;">Target Upgrade</td><td class="gold-text">Lvl ${targetLvlForLowest}</td></tr><tr><td style="background:#111;">XP per Card</td><td>${xpPerUpgrade.toLocaleString()}</td><td style="background:#111;">Total XP Gained</td><td class="green-text">${totalXpGain.toLocaleString()}</td><td style="background:#111;">Total Cost</td><td class="red-text">${totalGoldCostForMass.toLocaleString()}</td></tr><tr><td style="background:#111;">Simulated King Lvl</td><td class="gold-text">${simulatedLevel}</td><td style="background:#111;">XP Rem (Lvl 90)</td><td>${totalXpToMax.toLocaleString()}</td><td style="background:#111;">Rem After Sim</td><td class="green-text">${remAfterSim.toLocaleString()}</td></tr></table>`;
        document.getElementById("ladderPlanText").innerText = ladderPlanStr;
        document.getElementById("instantPlanText").innerText = instantPlanStr;

        let upgradable = globalResults.filter(r => r.actualLvl < MAX_LEVEL && r.status !== "Not Owned");
        upgradable.sort((a, b) => b.pctToNext - a.pctToNext);
        let upHTML = `
            <div class="tooltip-container" style="display:block; text-align:center;">
                <h3 style="color:#2ecc71; margin-bottom:10px;">🎯 TOP 3 UPGRADES <span class="tooltip-icon" style="font-size:10px;">❓<span class="tooltip-text" style="width:200px; margin-left:-100px;">The cards closest to having enough copies for their next level upgrade.</span></span></h3>
            </div>
            <table class="info-table"><tr><th>Card</th><th>Next Lvl</th><th>Progress</th><th>Cost</th></tr>`;
        for(let i=0; i<3; i++) {
            if(upgradable[i]) { 
                let next = upgradable[i].actualLvl + 1; 
                upHTML += `<tr><td class="card-cell"><img src="${upgradable[i].imgUrl}" class="card-img" onerror="this.style.display='none'"> <span>${upgradable[i].cleanName}</span></td><td>${next}</td><td class="green-text">${(upgradable[i].pctToNext*100).toFixed(1)}%</td><td class="gold-text">${GOLD_LADDER[next]}</td></tr>`; 
            } else { upHTML += `<tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; }
        }
        document.getElementById("topUpgradesData").innerHTML = upHTML + `</table>`;

        // --- ADVISOR ALGORITHM v23.4 (Smart Flow Update) ---
        const isEpicSunday = (new Date().getDay() === 0);
        const getScore = (r) => { 
            let next = r.actualLvl + 1; 
            if (next > MAX_LEVEL) return 0; 
            let req = CARD_LADDER[r.rarityKey][next]; 
            return req ? (r.stock / req) : 0; 
        };
        
        let permittedRarities = isEpicSunday ? ["common", "rare", "epic"] : ["common", "rare"];
        let targetLevel = lowestLvl;
        let reqList = [];

        for (let l = lowestLvl; l < MAX_LEVEL; l++) {
            let potentialCards = globalResults.filter(r => 
                r.status !== "Not Owned" && 
                r.actualLvl === l && 
                permittedRarities.includes(r.rarityKey) && 
                getScore(r) < 1 
            );

            if (potentialCards.length > 0) {
                targetLevel = l;
                potentialCards.sort((a, b) => getScore(b) - getScore(a));
                
                if (isEpicSunday) {
                    let sundayEpic = potentialCards.find(r => r.rarityKey === "epic");
                    if (sundayEpic) {
                        reqList.push(sundayEpic);
                        potentialCards = potentialCards.filter(r => r.id !== sundayEpic.id);
                    }
                }

                while(reqList.length < 3 && potentialCards.length > 0) {
                    reqList.push(potentialCards.shift());
                }
                break; 
            }
        }
        
        let titleColor = isEpicSunday ? '#9b59b6' : '#3498db';
        let advHTML = `
            <div class="tooltip-container" style="display:block; text-align:center;">
                <h3 style="color:${titleColor}; margin-bottom:10px;">🛒 ADVISOR (LVL ${targetLevel}+) <span class="tooltip-icon" style="font-size:10px;">❓<span class="tooltip-text" style="width:220px; margin-left:-110px;">Finds the lowest level cards that still need copies from the clan.</span></span></h3>
            </div>
            <table class="info-table"><tr><th>Card</th><th>Rarity</th><th>Stock</th><th>Ready %</th></tr>`;
        
        for(let i=0; i<3; i++) {
            if(reqList[i]) { 
                let color = reqList[i].rarityKey === "epic" ? "#9b59b6" : (reqList[i].rarityKey === "rare" ? "#f39c12" : "#3498db"); 
                advHTML += `<tr><td class="card-cell"><img src="${reqList[i].imgUrl}" class="card-img" onerror="this.style.display='none'"> <span>${reqList[i].cleanName}</span></td><td style="color:${color}; text-transform:capitalize;">${reqList[i].rarity}</td><td>${reqList[i].stock}</td><td class="green-text">${(getScore(reqList[i])*100).toFixed(1)}%</td></tr>`; 
            } else { 
                advHTML += `<tr><td style="color:#444">-</td><td style="color:#444">-</td><td style="color:#444">-</td><td style="color:#444">READY</td></tr>`; 
            }
        }
        document.getElementById("advisorData").innerHTML = advHTML + `</table>`;

        Chart.defaults.color = '#ccc';
        if(chartGold) chartGold.destroy();
        chartGold = new Chart(document.getElementById('goldChart'), { type: 'pie', data: { labels: ['Invested Gold', 'Remaining Gold'], datasets: [{ data: [spent, rem], backgroundColor: ['#2ecc71', '#e74c3c'], borderWidth: 0 }] }, options: { plugins: { title: { display: true, text: 'Gold Progress' } } } });
        if(chartCards) chartCards.destroy();
        chartCards = new Chart(document.getElementById('cardsChart'), { type: 'doughnut', data: { labels: ['Collected', 'Missing Common', 'Missing Rare', 'Missing Epic', 'Missing Leg.', 'Missing Champ.'], datasets: [{ data: [cardCollTotal, missingByRarity.common, missingByRarity.rare, missingByRarity.epic, missingByRarity.legendary, missingByRarity.champion], backgroundColor: ['#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#00cec9', '#f1c40f'], borderWidth: 0 }] }, options: { plugins: { title: { display: true, text: 'Card Collection Spectrum' } }, cutout: '50%' } });
        if(chartXp) chartXp.destroy();
        chartXp = new Chart(document.getElementById('xpChart'), { type: 'doughnut', data: { labels: ['Earned XP', 'Remaining XP'], datasets: [{ data: [playerTotalXp, totalXpToMax], backgroundColor: ['#8e44ad', '#ecf0f1'], borderWidth: 0 }] }, options: { plugins: { title: { display: true, text: "King's Journey XP" } }, cutout: '50%' } });

        renderMainTable();
        statusMsg.innerText = "✅ Analysis Complete!";
        statusMsg.style.color = "#2ecc71";
        dash.style.opacity = "1"; 
        openTab('overview'); 
    } catch (error) {
        console.error(error);
        statusMsg.innerText = "❌ Error: " + error.message;
        statusMsg.style.color = "#e74c3c";
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
            let aOwned = a.status !== "Not Owned" ? 1 : 0;
            let bOwned = b.status !== "Not Owned" ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned; 
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];
        } else {
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];
            let aOwned = a.status !== "Not Owned" ? 1 : 0;
            let bOwned = b.status !== "Not Owned" ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned; 
        }
        if (b.pctToNext !== a.pctToNext) return b.pctToNext - a.pctToNext;
        return b.actualLvl - a.actualLvl;
    });

    const startTargetLvl = Math.min(globalMinLevel + 1, MAX_LEVEL);
    let tableHTML = `<thead><tr><th class="text-left">Card Name</th><th>Rarity</th><th>Level</th><th>Stock</th><th>% Next</th><th>% Max</th>`;
    for (let i = startTargetLvl; i <= MAX_LEVEL; i++) tableHTML += `<th>To Lvl ${i}</th>`;
    tableHTML += `<th>Gold Spent</th><th>Gold Rem</th></tr></thead><tbody>`;

    let currentCategoryKey = ""; 
    let colSpanCount = 8 + (MAX_LEVEL - startTargetLvl + 1);
    let hasTowersInCurrentFilter = filteredResults.some(r => r.isTower);

    filteredResults.forEach(r => {
        let newCategoryKey = "";
        let shouldPrintLabel = false;
        let labelText = "";
        let labelColor = "#fff";

        if (currentActiveFilter === 'all') {
            newCategoryKey = r.isTower ? "all_towers" : r.rarityKey;
            if (newCategoryKey !== currentCategoryKey) {
                shouldPrintLabel = true;
                if (newCategoryKey === "all_towers") { labelText = "TOWER TROOPS"; labelColor = "#e74c3c"; }
                else if (r.rarityKey === "champion") { labelText = "CHAMPIONS"; labelColor = "#f1c40f"; }
                else if (r.rarityKey === "legendary") { labelText = "LEGENDARY"; labelColor = "#00cec9"; }
                else if (r.rarityKey === "epic") { labelText = "EPIC"; labelColor = "#9b59b6"; }
                else if (r.rarityKey === "rare") { labelText = "RARE"; labelColor = "#e67e22"; }
                else if (r.rarityKey === "common") { labelText = "COMMON"; labelColor = "#bdc3c7"; }
            }
        } else if (currentActiveFilter === 'tower') {
            shouldPrintLabel = false; 
        } else {
            newCategoryKey = r.isTower ? `tower_${r.rarityKey}` : `troop_${r.rarityKey}`;
            if (newCategoryKey !== currentCategoryKey && hasTowersInCurrentFilter) {
                shouldPrintLabel = true;
                let rarityDisplay = r.rarity.toUpperCase();
                labelText = r.isTower ? `${rarityDisplay} TOWERS` : `${rarityDisplay} TROOPS & SPELLS`;
                if (r.rarityKey === "champion") labelColor = "#f1c40f";
                else if (r.rarityKey === "legendary") labelColor = "#00cec9";
                else if (r.rarityKey === "epic") labelColor = "#9b59b6";
                else if (r.rarityKey === "rare") labelColor = "#e67e22";
                else if (r.rarityKey === "common") labelColor = "#bdc3c7";
                if (r.isTower) labelColor = "#e74c3c"; 
            }
        }

        if (shouldPrintLabel && labelText !== "") {
            tableHTML += `<tr class="table-separator" style="background-color: #111 !important;"><td colspan="${colSpanCount}" style="color: ${labelColor}; padding: 10px !important;">▬▬▬ ${labelText} ▬▬▬</td></tr>`;
            currentCategoryKey = newCategoryKey; 
        } else if (currentActiveFilter !== 'all') {
            currentCategoryKey = newCategoryKey;
        }

        let rowStyle = (r.actualLvl === MAX_LEVEL) ? "style='color:#f1c40f; font-weight:bold;'" : "";
        let rarityColor = r.rarityKey==='epic' ? '#9b59b6' : r.rarityKey==='legendary' ? '#00cec9' : r.rarityKey==='champion' ? '#f1c40f' : r.rarityKey==='rare' ? '#e67e22' : '#bdc3c7';
        let isLockedClass = (r.status === "Not Owned") ? "locked-card" : "";
        let displayPctNext = r.status === "Not Owned" ? "-" : (r.pctToNext * 100).toFixed(1) + "%";
        let pctColorClass = (r.pctToNext >= 1 && r.status !== "Not Owned") ? "green-text" : "";

        tableHTML += `<tr ${rowStyle} data-rarity="${r.rarityKey}" data-istower="${r.isTower}">
            <td class="card-cell ${isLockedClass}"><img src="${r.imgUrl}" class="card-img" onerror="this.style.display='none'"> <span>${r.cleanName}</span></td>
            <td style="text-transform: capitalize; color: ${rarityColor}; font-weight:bold;" class="${isLockedClass}">${r.rarity}</td>
            <td class="${isLockedClass}">${r.status}</td>
            <td class="${isLockedClass}">${r.stock.toLocaleString()}</td>
            <td class="${pctColorClass} ${isLockedClass}">${displayPctNext}</td>
            <td class="${isLockedClass}">${(r.pctToMax * 100).toFixed(1)}%</td>`;
        for (let i = startTargetLvl; i <= MAX_LEVEL; i++) {
            let missing = r.missingLevels[i] || 0;
            if (r.actualLvl >= i) tableHTML += `<td style="color:#555" class="${isLockedClass}">-</td>`;
            else if (missing === 0) tableHTML += `<td class="${isLockedClass}">✅</td>`;
            else tableHTML += `<td class="red-text ${isLockedClass}">${missing.toLocaleString()}</td>`;
        }
        tableHTML += `<td class="green-text ${isLockedClass}">${r.spent.toLocaleString()}</td><td class="gold-text ${isLockedClass}">${r.rem.toLocaleString()}</td></tr>`;
    });
    tableHTML += `</tbody>`;
    document.getElementById("mainDataTable").innerHTML = tableHTML;
}