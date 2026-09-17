/**
 * Clash Royale Web Engine v27.0 - E-Sports Analytics Update
 * Engineered for M7amd 3naswah
 */

const PROXY_BASE = "https://Anaswah20011.pythonanywhere.com";

const GOLD_LADDER = [0, 0, 5, 20, 50, 150, 400, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 120000];
const START_LVL = { "common": 1, "rare": 3, "epic": 6, "legendary": 9, "champion": 11 };
const MAX_LEVEL = GOLD_LADDER.length - 1; // 16

const CARD_LADDER = {
    "common": [0, 1, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1000, 1500, 2500, 3500, 5500, 7500],
    "rare": [0, 0, 0, 1, 2, 4, 10, 20, 50, 100, 200, 300, 400, 550, 750, 1000, 1400],
    "epic": [0, 0, 0, 0, 0, 0, 1, 2, 4, 10, 20, 30, 50, 70, 100, 130, 180],
    "legendary": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 6, 9, 12, 14, 20],
    "champion": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 5, 8, 11, 15]
};

const RARITY_RANK = { "champion": 1, "legendary": 2, "epic": 3, "rare": 4, "common": 5 };

// ==========================================
// 🔥 1. المحرك الديناميكي للقاموس (Dynamic Dictionary) 🔥
// ==========================================
let MASTER_DICT = {};
let isDictLoaded = false;
const ADMIN_TAG = "2RG9P9Y";
let unclassifiedCardsList = [];
const TOWER_TROOPS_MANUAL = ["royal-chef", "dagger-duchess", "cannoneer", "tower-princess"];

async function loadMasterDictionary() {
    if (isDictLoaded) return;
    try {
        let res = await fetch(`${PROXY_BASE}/master_dictionary.json?_t=${new Date().getTime()}`);
        let dictData = await res.json();

        for (let cat in dictData.PRIMARY_CATEGORIES) {
            dictData.PRIMARY_CATEGORIES[cat].forEach(card => {
                MASTER_DICT[card] = { primary: cat, tags: [], evoTags: [] };
            });
        }

        TOWER_TROOPS_MANUAL.forEach(tower => {
            MASTER_DICT[tower] = { primary: "Tower", tags: [], evoTags: [] };
        });

        // نظام الإنقاذ الذكي للبطاقات الغير مصنفة أساسياً
        for (let tag in dictData.TAGS_CATEGORIES) {
            dictData.TAGS_CATEGORIES[tag].forEach(card => {
                let baseCard = card.startsWith('evo-') ? card.replace('evo-', '') : card;
                if (!MASTER_DICT[baseCard]) {
                    MASTER_DICT[baseCard] = { primary: "Support", tags: [], evoTags: [] };
                }
                if (card.startsWith('evo-')) {
                    MASTER_DICT[baseCard].evoTags.push(tag);
                } else {
                    MASTER_DICT[baseCard].tags.push(tag);
                }
            });
        }

        isDictLoaded = true;
        console.log("✅ Master Dictionary Loaded Successfully!");
    } catch (e) {
        console.error("❌ Failed to load Master Dictionary:", e);
    }
}

function getCardInfo(cardName) {
    if (!cardName) return { primary: "Support", tags: [], evoTags: [] };
    // تنظيف الاسم ليطابق القاموس (حروف صغيرة وبدون مسافات)
    let nameLower = cardName.toLowerCase().trim().replace(/\s+/g, '-').replace(/\./g, '').replace(/'/g, '');

    if (MASTER_DICT[nameLower]) return MASTER_DICT[nameLower];

    if (!unclassifiedCardsList.includes(cardName)) unclassifiedCardsList.push(cardName);
    return { primary: "Support", tags: [], evoTags: [] };
}

// ==========================================
// 🔥 2. خوارزمية النقاط المتقدمة مع التاجات (AI Scoring Engine) 🔥
// ==========================================
function runAIHolisticAnalysis(globalCards, deckCardIDs, playerTag, includeTowers) {
    let categoryStats = {};
    let accountTotalLvl = 0;
    let accountCardCount = 0;

    // حساب متوسط الحساب بشكل عام والفئات بشكل خاص
    globalCards.forEach(c => {
        if (c.status === "Not Owned") return;
        let info = getCardInfo(c.cleanName);
        if (info.primary === "Tower" && !includeTowers) return;

        accountTotalLvl += c.actualLvl;
        accountCardCount++;

        if (!categoryStats[info.primary]) categoryStats[info.primary] = { sum: 0, count: 0 };
        categoryStats[info.primary].sum += c.actualLvl;
        categoryStats[info.primary].count++;
    });

    let accountAverage = accountCardCount > 0 ? (accountTotalLvl / accountCardCount) : 10;
    let weakestCategory = ""; let lowestAvg = 99;
    let categoryAverages = {}; // 🔥 مصفوفة جديدة لحفظ كل المتوسطات

    for (let cat in categoryStats) {
        if (categoryStats[cat].count > 0) {
            let avg = categoryStats[cat].sum / categoryStats[cat].count;
            categoryAverages[cat] = avg.toFixed(1); // حفظ المتوسط برقم عشري واحد
            if (avg < lowestAvg) { lowestAvg = avg; weakestCategory = cat; }
        }
    }

    let scoredCards = [];

    // أوزان التاجات الميكانيكية (السرية)
    const TIER_1_TAGS = ['resets', 'resets-charge', 'anti-air-spell', 'high-damage-anti-air', 'has-knockback'];
    const TIER_2_TAGS = ['ground-attacking-splash', 'air-attacking-splasher', 'charges', 'building-chaser', 'spawner-troop', 'spawner-building'];

    globalCards.forEach(c => {
        if (c.status === "Not Owned" || c.actualLvl >= MAX_LEVEL) return;

        let info = getCardInfo(c.cleanName);
        if (info.primary === "Tower" && !includeTowers) return;

        let score = 0; let reasons = [];

        let isEvoUnlocked = (c.isEvo && c.evoLevel === 1);
        let isHeroUnlocked = (c.isHero && c.evoLevel === 2);
        let activeTags = [...info.tags];
        if (isEvoUnlocked || isHeroUnlocked) activeTags = activeTags.concat(info.evoTags);

        // 1. القواعد السيادية
        if (deckCardIDs.has(c.id)) { score += 50; reasons.push("Main Deck (+50)"); }
        if (info.primary === weakestCategory) { score += 30; reasons.push(`Weakest Category: ${info.primary} (+30)`); }

        // 2. فجوة الحساب الذكية (مقارنة بمتوسط حسابك مش بالماكس)
        let gapFromAvg = accountAverage - c.actualLvl;
        if (gapFromAvg >= 2) {
            let gapPts = Math.round(gapFromAvg * 10); // 20 نقطة لمستويين تأخير
            score += gapPts;
            reasons.push(`Account Level Gap (+${gapPts})`);
        }

        // 3. التقييم المتدرج لنسبة الاكتمال (Proportional Scoring)
        let readyPts = Math.floor(c.pctToNext * 15);
        if (readyPts > 0) {
            score += readyPts;
            reasons.push(`Stock Progress (+${readyPts})`);
        }

        // 🔥 قانون مكافحة التجميد (Anti-Freeze Penalty) للندرات العالية 🔥
        if ((c.rarityKey === "legendary" || c.rarityKey === "champion") && c.pctToNext < 0.9) {
            score -= 10;
            reasons.push("High Rarity Freeze Penalty (-10)");
        }
        // 3. التطويرات الخارقة
        if (isEvoUnlocked) { score += 20; reasons.push("Evo Unlocked (+20)"); }
        if (isHeroUnlocked) { score += 20; reasons.push("Hero Unlocked (+20)"); }

        // 4. تقييم التاجات الميكانيكية الشاملة (Versatility Value)
        let tagScore = 0;
        activeTags.forEach(t => {
            if (TIER_1_TAGS.includes(t)) { tagScore += 4; }
            else if (TIER_2_TAGS.includes(t)) { tagScore += 2; }
        });
        if (tagScore > 0) {
            score += tagScore;
            reasons.push(`Mechanical Utility (+${tagScore})`);
        }

        // 5. تاجات حساسية المستوى
        if (activeTags.includes("weak-when-underleveled") && (accountAverage - c.actualLvl >= 1)) {
            score += 15; reasons.push("Critical if underleveled (+15)");
        }
        if (activeTags.includes("level-independent")) {
            score -= 1; reasons.push("Level Independent (-1)");
        }
        // 🔥 6. التوازن الاقتصادي للندرة (Economy Balancer) 🔥
        if (window.globalRarityStats && window.globalRarityStats[c.rarityKey]) {
            let rStat = window.globalRarityStats[c.rarityKey];
            if (rStat.ct > 0) {
                let compPct = (rStat.cs / rStat.ct) * 100;
                let ecoScore = 0;

                // كل ما كانت الندرة متأخرة أكثر، بتاخذ نقاط تشجيعية أكثر لكسر التعادل
                if (compPct < 90) ecoScore = 3;
                else if (compPct < 95) ecoScore = 2;
                else if (compPct < 98) ecoScore = 1;

                if (ecoScore > 0) {
                    score += ecoScore;
                    reasons.push(`Economy Balancer (+${ecoScore})`);
                }
            }
        }

        if (score <= 0) {
            score = 0; // تصفير أي قيمة سالبة (عشان الكلون ما يطلع تقييمه -1)
            reasons.push("Stable Card / No Urgent Priority (+0)");
        }
        scoredCards.push({ card: c, score: score, category: info.primary, reasons: reasons });;
    });

    scoredCards.sort((a, b) => b.score - a.score);
    return {
        allSorted: scoredCards,
        recommendations: scoredCards.slice(0, 3),
        weakestCategory: weakestCategory,
        categoryAverages: categoryAverages, // 🔥 تمرير المتوسطات للواجهة
        accountAverage: accountAverage.toFixed(1),
        unclassified: unclassifiedCardsList,
        isAdmin: (playerTag === ADMIN_TAG)
    };
}
// ==========================================
// 🔥 3. واجهات العرض (Main Dashboard & AI Lab) 🔥
// ==========================================
// ==========================================
// 🔥 3. عرض النتائج والميزانية (UI & Enforcer - Waterfall Budgeting) 🔥
// ==========================================
function calculateHolisticAI() {
    if (!globalResults || globalResults.length === 0) return;

    // قراءة الميزانية وزر الأبراج
    let budgetInput = document.getElementById("aiBudgetInput") ? document.getElementById("aiBudgetInput").value : "";
    let budget = budgetInput !== "" ? parseInt(budgetInput) : null;
    let includeTowers = document.getElementById("aiIncludeTowers") ? document.getElementById("aiIncludeTowers").checked : false;

    let tag = window.currentPlayerTag || "";
    let deckIDs = window.lastDeckIDs || new Set();

    // تشغيل محرك التحليل
    let aiData = runAIHolisticAnalysis(globalResults, deckIDs, tag, includeTowers);

    let alertBox = document.getElementById("aiAdminAlert");
    if (aiData.isAdmin && aiData.unclassified.length > 0) {
        alertBox.style.display = "block";
        document.getElementById("aiUnclassifiedList").innerText = aiData.unclassified.join(", ");
    } else {
        alertBox.style.display = "none";
    }

    let resultsBox = document.getElementById("aiHolisticResults");
    if (aiData.recommendations.length === 0) {
        resultsBox.innerHTML = `<div style="text-align:center; color:var(--accent-green); padding: 15px;"><i class="fa-solid fa-check-double"></i> Your account is perfectly balanced or maxed out!</div>`;
        return;
    }

    // 🔥 بناء شريط شارات الفئات (Badges) مرتبة من الأضعف للأقوى
    let badgesHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">`;
    let sortedCats = Object.keys(aiData.categoryAverages).sort((a, b) => aiData.categoryAverages[a] - aiData.categoryAverages[b]);

    sortedCats.forEach(cat => {
        let avg = aiData.categoryAverages[cat];
        let isWeakest = (cat === aiData.weakestCategory);
        let badgeBg = isWeakest ? "rgba(168, 85, 247, 0.15)" : "rgba(0,0,0,0.3)";
        let badgeBorder = isWeakest ? "1px solid var(--accent-purple)" : "1px solid rgba(255,255,255,0.05)";
        let badgeColor = isWeakest ? "var(--accent-purple)" : "var(--text-muted)";

        badgesHtml += `<span style="background: ${badgeBg}; border: ${badgeBorder}; color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
            ${cat}: ${avg}
        </span>`;
    });
    badgesHtml += `</div>`;

    let html = `<div style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">
        <i class="fa-solid fa-magnifying-glass-chart"></i> AI Strategy: Focus on <strong style="color:var(--text-main); font-size: 15px;">${aiData.weakestCategory}</strong>. Your account average is Lvl ${aiData.accountAverage}, and this category is dragging you down.
        ${badgesHtml} <!-- 🔥 طباعة الشارات هنا -->
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">`;
    // 💸 تهيئة الشلال المالي
    let currentBudget = budget;

    aiData.recommendations.forEach((rec, index) => {
        let card = rec.card;
        let nextLevel = card.actualLvl + 1;
        let upgradeCost = GOLD_LADDER[nextLevel] || 0;
        let isReady = (card.pctToNext >= 1);
        let isTopChoice = (index === 0);

        let boxBorder = isTopChoice ? "border: 1px solid var(--accent-purple);" : "border: 1px solid rgba(255,255,255,0.1); opacity: 0.9;";
        let decisionHtml = "";

        if (budget === null) {
            decisionHtml = `<div style="margin-top:10px; padding:8px; background:rgba(255,255,255,0.05); border-radius:4px; text-align:center;"><span style="color:var(--text-muted); font-size:11px;">Enter budget for financial decision.</span></div>`;
        } else {
            // حساب كم متبقي من الفلوس لهي البطاقة (لا يقل عن 0)
            let availableForThis = Math.max(0, currentBudget);

            if (!isReady) {
                // تحديد الرسالة حسب قوانين اللعبة والندرة
                let actionText = "Request from clan!";
                if (card.rarityKey === "epic") actionText = "Wait for Epic Sunday!";
                else if (card.rarityKey === "legendary" || card.rarityKey === "champion") actionText = "Use Wild Cards or Shop!";

                decisionHtml = `<div style="margin-top:10px; padding:8px; background:rgba(234, 179, 8, 0.15); border-radius:4px; text-align:center; border: 1px solid #eab308;">
                    <div style="color:#eab308; font-weight:bold; font-size:13px;"><i class="fa-solid fa-hourglass-half"></i> FUND RESERVED</div>
                    <div style="color:#d1d5db; font-size:11px; margin-top:3px;">Locked ${(upgradeCost / 1000).toFixed(0)}k. ${actionText}</div>
                </div>`;
            } else if (availableForThis >= upgradeCost) {
                // الترقية الفورية (الفلوس اللي وصلتها بتكفي)
                decisionHtml = `<div style="margin-top:10px; padding:8px; background:rgba(34, 197, 94, 0.15); border-radius:4px; text-align:center; border: 1px solid var(--accent-green);">
                    <div style="color:var(--accent-green); font-weight:bold; font-size:13px;"><i class="fa-solid fa-unlock"></i> GREEN LIGHT</div>
                    <div style="color:var(--accent-green); font-size:11px; margin-top:3px;">Budget covers this! Upgrade now.</div>
                </div>`;
            } else {
                // الفلوس اللي وصلتها من البطاقات اللي قبلها ما بتكفي
                let shortFall = upgradeCost - availableForThis;
                decisionHtml = `<div style="margin-top:10px; padding:8px; background:rgba(239, 68, 68, 0.15); border-radius:4px; text-align:center; border: 1px solid var(--accent-red);">
                    <div style="color:var(--accent-red); font-weight:bold; font-size:13px;"><i class="fa-solid fa-lock"></i> RED LIGHT (SAVE)</div>
                    <div style="color:var(--accent-red); font-size:11px; margin-top:3px;">Save <strong style="color:white;">${shortFall.toLocaleString()}</strong> more gold.</div>
                </div>`;
            }

            // خصم تكلفة البطاقة الحالية من الميزانية (سواء انصرفت أو انحجزت) لتمرير الباقي للبطاقة اللي بعدها
            currentBudget -= upgradeCost;
        }

        let reasonsHtml = rec.reasons.map(r => `<span style="display:inline-block; background:rgba(0,0,0,0.3); padding:3px 6px; border-radius:4px; margin:2px; font-size:10px; color:#a1a1aa;">${r}</span>`).join("");

        html += `<div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; ${boxBorder}">
            <div style="display:flex; gap:15px; align-items:center;">
                <img src="${card.imgUrl}" style="width:40px; object-fit:contain;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between;"><strong style="color:white; font-size:13px;">${card.cleanName}</strong> <span class="gold-text" style="font-weight:bold; font-size:12px;">${(upgradeCost / 1000).toFixed(0)}k <i class="fa-solid fa-coins"></i></span></div>
                    <div style="color:var(--text-muted); font-size:11px; margin-bottom:5px;">Target: Lvl ${nextLevel}</div>
                    <div style="color:var(--accent-purple); font-weight:bold; font-size:12px;"><i class="fa-solid fa-star"></i> Score: ${rec.score} pts</div>
                </div>
            </div>
            <div style="margin-top:10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top:8px;">${reasonsHtml}</div>
            ${decisionHtml}
        </div>`;
    });

    html += `</div>`;
    resultsBox.innerHTML = html;

    // 2. تحديث صفحة المختبر (AI Lab) بكل البطاقات
    let labBox = document.getElementById("aiLabGrid");
    if (labBox) {
        let labHtml = "";
        aiData.allSorted.forEach((rec, idx) => {
            let card = rec.card;
            let rankColor = idx === 0 ? "var(--accent-gold)" : idx < 3 ? "var(--accent-green)" : "var(--text-muted)";
            let reasonsStr = rec.reasons.map(r => `• ${r}`).join("<br>");

            labHtml += `<div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    <div style="display:flex; gap: 10px; align-items: center;">
                        <span style="font-size: 16px; font-weight: 900; color: ${rankColor}; width: 25px;">#${idx + 1}</span>
                        <img src="${card.imgUrl}" style="width:30px; height:35px; object-fit:contain;">
                        <div>
                            <div style="color:white; font-weight:bold; font-size: 13px;">${card.cleanName}</div>
                            <div style="color:var(--text-muted); font-size:10px;">Lvl ${card.actualLvl} | ${rec.category}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color:var(--accent-purple); font-weight:900; font-size: 18px;">${rec.score}</div>
                        <div style="color:var(--text-muted); font-size:9px;">TOTAL PTS</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #a1a1aa; line-height: 1.5; flex: 1;">
                    ${reasonsStr}
                </div>
            </div>`;
        });
        labBox.innerHTML = labHtml;
    }
}

Chart.defaults.color = '#a1a1aa';
Chart.defaults.font.family = "'Inter', sans-serif";

let chartGold, chartCards, chartXp, chartLevels, chartWinLoss;
let globalResults = [];
let globalMinLevel = 14;
let currentActiveFilter = 'all';

function getAdvancedCardImage(cardName, isHero, isEvo) {
    // تنظيف الاسم (تحويل الحروف لصغيرة، استبدال المسافات، وإزالة النقاط)
    let formattedName = cardName.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-');

    // تحديد نوع الإطار المطلوب
    let suffix = "";
    if (isHero) suffix += "-hero";
    if (isEvo) suffix += "-ev1";

    // الرابط السري الدقيق من RoyaleAPI
    let baseUrl = "https://cdns3.royaleapi.com/cdn-cgi/image/q=100,w=150,format=auto/static/img/cards/v11-a8e42334/";

    return `${baseUrl}${formattedName}${suffix}.png`;
}

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
    if (activeBtn) activeBtn.classList.add('active');
}

function filterCards(type, btnElement) {
    currentActiveFilter = type;
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
    renderMainTable();
}

document.addEventListener("DOMContentLoaded", () => {
    loadTagHistory();
    document.getElementById("playerTag").addEventListener("keypress", function (event) {
        if (event.key === "Enter") { event.preventDefault(); startAnalysis(); }
    });
});

function loadTagHistory() {
    let history = JSON.parse(localStorage.getItem("cr_tag_history")) || [];
    let datalist = document.getElementById("tagHistory");
    if (datalist) {
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
    if (!tag) return;
    let history = JSON.parse(localStorage.getItem("cr_tag_history")) || [];
    history = history.filter(t => t !== tag);
    history.unshift(tag);
    if (history.length > 10) history.pop();
    localStorage.setItem("cr_tag_history", JSON.stringify(history));
    loadTagHistory();
}

async function fetchAllCards() {
    // استخدمنا اسماً جديداً للذاكرة لنجبر المتصفح على تحميل التحديث
    let cached = localStorage.getItem("cr_allcards_v2");
    if (cached) return JSON.parse(cached);

    let res = await fetch(`${PROXY_BASE}/allcards`);
    if (!res.ok) throw new Error("Failed to fetch allcards");

    let data = await res.json();
    // نحفظ البيانات بالاسم الجديد
    localStorage.setItem("cr_allcards_v2", JSON.stringify(data));
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
    await loadMasterDictionary();
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
        console.log("Raw Player Cards:", pData.cards);

        statusMsg.innerHTML = `<i class="fa-solid fa-microchip fa-spin"></i> Processing Game Data...`;
        let gCardsRaw = await fetchAllCards();

        // دمج البطاقات والأبراج من الـ API مباشرة
        let gCards = [...(gCardsRaw.items || []), ...(gCardsRaw.supportItems || [])];
        let pCards = [...(pData.cards || []), ...(pData.supportCards || [])];

        const pMap = {};
        pCards.forEach(c => pMap[c.id] = c);

        let minAccountLevel = MAX_LEVEL;
        let spent = 0, rem = 0, maxedCount = 0, cardCollTotal = 0, cardReqTotal = 0;
        let missingByRarity = { "common": 0, "rare": 0, "epic": 0, "legendary": 0, "champion": 0 };
        let rarityStats = { "common": { gs: 0, gr: 0, cs: 0, ct: 0 }, "rare": { gs: 0, gr: 0, cs: 0, ct: 0 }, "epic": { gs: 0, gr: 0, cs: 0, ct: 0 }, "legendary": { gs: 0, gr: 0, cs: 0, ct: 0 }, "champion": { gs: 0, gr: 0, cs: 0, ct: 0 } };
        let towerS = 0, towerR = 0, towerCS = 0, towerCT = 0;

        let levelCounts = Array(17).fill(0);

        // حساب الستار بوينت المصروفة
        let starPointsSpent = 0;
        pCards.forEach(c => {
            if (c.starLevel) {
                if (c.starLevel >= 1) starPointsSpent += 10000;
                if (c.starLevel >= 2) starPointsSpent += 15000;
                if (c.starLevel >= 3) starPointsSpent += 20000;
            }
        });

        globalResults = gCards.map(gCard => {
            const pCard = pMap[gCard.id];
            const isOwned = !!pCard;
            const rarity = gCard.rarity ? gCard.rarity.toLowerCase() : "common";
            const currentLvl = isOwned ? ((pCard.level || 0) + (START_LVL[rarity] - 1)) : 0;
            if (isOwned && currentLvl > 0 && currentLvl < minAccountLevel) minAccountLevel = currentLvl;
            if (isOwned && currentLvl > 0 && currentLvl <= 16) levelCounts[currentLvl]++;

            // --- استخراج الصور الرسمية وحالة الـ Hero/Evo من الـ API ---
            // إذا لم يوفر الـ API الصورة، نستخدم الدالة القديمة كاحتياط
            const imgUrl = gCard.iconUrls ? gCard.iconUrls.medium : getCardImageUrl(gCard.name);
            // استخراج حالة الـ Hero/Evo من الـ API
            const isEvo = (gCard.iconUrls && gCard.iconUrls.evolutionMedium) ? true : false;
            const isHero = (gCard.iconUrls && gCard.iconUrls.heroMedium) ? true : false;
            const evoLevel = isOwned ? (pCard.evolutionLevel || 0) : 0;
            // -------------------------------------------------------------

            let goldSpent = 0, goldNeeded = 0, cardsInvested = 0, cardsTotalReq = 0, missingPerLevel = Array(MAX_LEVEL + 1).fill(0), tempStock = isOwned ? (pCard.count || 0) : 0;

            for (let l = START_LVL[rarity] + 1; l <= MAX_LEVEL; l++) {
                let cReq = CARD_LADDER[rarity] ? CARD_LADDER[rarity][l] || 0 : 0;
                cardsTotalReq += cReq;
                if (isOwned && l <= currentLvl) { goldSpent += GOLD_LADDER[l] || 0; cardsInvested += cReq; }
            }

            let cardsCollected = cardsInvested + tempStock;
            if (cardsCollected > cardsTotalReq) cardsCollected = cardsTotalReq;

            let possibleUpgradesCount = 0;
            const startCalc = isOwned ? currentLvl : (START_LVL[rarity] - 1);
            for (let targetLvl = startCalc + 1; targetLvl <= MAX_LEVEL; targetLvl++) {
                if (targetLvl > START_LVL[rarity]) goldNeeded += GOLD_LADDER[targetLvl] || 0;
                let req = CARD_LADDER[rarity] ? CARD_LADDER[rarity][targetLvl] || 0 : 0;
                if (tempStock >= req && req > 0) {
                    tempStock -= req;
                    possibleUpgradesCount++;
                } else {
                    missingPerLevel[targetLvl] = req - tempStock;
                    tempStock = 0;
                }
            }

            const isTower = String(gCard.id).startsWith("15");
            let pctToMax = (cardsTotalReq > 0) ? (cardsCollected / cardsTotalReq) : 1;
            let pctToNext = 0;
            if (currentLvl < MAX_LEVEL) {
                let nextReq = CARD_LADDER[rarity][currentLvl + 1] || 0;
                if (nextReq > 0) { pctToNext = Math.min(1, (isOwned ? (pCard.count || 0) : 0) / nextReq); }
            }

            spent += goldSpent; rem += goldNeeded; cardCollTotal += cardsCollected; cardReqTotal += cardsTotalReq;
            if (currentLvl === MAX_LEVEL) maxedCount++;
            let missingCards = cardsTotalReq - cardsCollected;
            if (missingCards > 0 && missingByRarity[rarity] !== undefined) missingByRarity[rarity] += missingCards;

            if (isTower) { towerS += goldSpent; towerR += goldNeeded; towerCS += cardsCollected; towerCT += cardsTotalReq; }
            if (rarityStats[rarity]) { rarityStats[rarity].gs += goldSpent; rarityStats[rarity].gr += goldNeeded; rarityStats[rarity].cs += cardsCollected; rarityStats[rarity].ct += cardsTotalReq; }

            // تم تحديث الـ return لتشمل الصورة الرسمية والبيانات المخفية الجديدة
            return {
                id: gCard.id,
                cleanName: gCard.name || "Unknown",
                imgUrl: imgUrl,
                rarity: rarity,
                rarityKey: rarity,
                actualLvl: currentLvl,
                status: isOwned ? currentLvl : "Not Owned",
                stock: isOwned ? (pCard.count || 0) : 0,
                spent: goldSpent,
                rem: goldNeeded,
                missingLevels: missingPerLevel,
                isTower: isTower,
                pctToMax: pctToMax,
                pctToNext: pctToNext,
                // الإضافات الخاصة بالتطور والأبطال
                isEvo: isEvo,
                isHero: isHero,
                evoLevel: evoLevel,
                possibleUpgrades: possibleUpgradesCount
            };
        });

        globalMinLevel = minAccountLevel;
        window.globalRarityStats = rarityStats; // 🔥 تمرير بيانات الاقتصاد الكلي للخوارزمية
        const totalGold = spent + rem;
        const unownedCount = globalResults.filter(r => r.status === "Not Owned").length;

        document.getElementById("playerGreeting").innerHTML = `<i class="fa-solid fa-user-astronaut" style="color: var(--accent-blue);"></i> WELCOME, <span style="color:var(--text-main);">${pData.name}</span>`;

        let daysPlayedRaw = 0;
        if (pData && pData.badges) { const badge = pData.badges.find(b => b.name === "YearsPlayed"); if (badge) daysPlayedRaw = badge.progress; }
        const today = new Date(); const creationDate = new Date(today.getTime() - (daysPlayedRaw * 24 * 60 * 60 * 1000));
        let years = today.getFullYear() - creationDate.getFullYear(); let months = today.getMonth() - creationDate.getMonth(); let days = today.getDate() - creationDate.getDate();
        if (days < 0) { months--; const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0); days += prevMonthDate.getDate(); }
        if (months < 0) { years--; months += 12; }

        // قراءة بيانات النظام الجديد من الـ API
        let collLevel = pData.collectionLevel || 0;
        let kingTower = pData.kingTowerLevel || 1;

        // ديناميكية المكافآت: كل 10 مستويات (تحت 1500) وكل 5 مستويات (فوق 1500)
        let milestoneStep = collLevel >= 1500 ? 5 : 10;
        let nextCollMilestone = (Math.floor(collLevel / milestoneStep) + 1) * milestoneStep;
        let collPct = collLevel === 0 ? 0 : ((collLevel % milestoneStep) / milestoneStep) * 100;

        let ownedCards = globalResults.filter(r => r.status !== "Not Owned" && r.actualLvl < MAX_LEVEL);
        let lowestLvl = MAX_LEVEL;
        ownedCards.forEach(c => { if (c.actualLvl < lowestLvl) lowestLvl = c.actualLvl; });
        let countLowest = ownedCards.filter(c => c.actualLvl === lowestLvl).length;
        let targetLvlForLowest = lowestLvl + 1;
        let totalGoldCostForMass = (GOLD_LADDER[targetLvlForLowest] || 0) * countLowest;

        // البحث عن أرخص الترقيات لرفع مستوى المجموعة بسرعة (الأولوية للذهب الآن وليس الـ XP)
        let readyCards = ownedCards.filter(c => {
            let nextReq = CARD_LADDER[c.rarityKey][c.actualLvl + 1];
            return nextReq > 0 && c.stock >= nextReq;
        });
        readyCards.forEach(c => { c.nextGold = GOLD_LADDER[c.actualLvl + 1] || 0; });
        readyCards.sort((a, b) => a.nextGold - b.nextGold);

        let instantGold = 0, instantNames = [];
        for (let c of readyCards) {
            if (instantNames.length >= 3) break;
            instantGold += c.nextGold;
            instantNames.push(`${c.cleanName}(${c.actualLvl + 1})`);
        }
        let instantPlanStr = instantNames.length > 0 ? `Cheapest: ${instantNames.join(", ")} (${(instantGold / 1000).toFixed(1)}k Gold)` : "No ready cards.";
        let ladderPlanStr = `Mass upgrade Lvl ${lowestLvl} gives +${countLowest} Collection Levels.`;

        let wins = pData.wins || 0;
        let losses = pData.losses || 0;
        let draws = Math.max(0, (pData.battleCount || 0) - wins - losses);

        let spAmount = pData.starPoints || 0;
        let isSpMax = spAmount === 5000000;
        let spDisplay = spAmount.toLocaleString() + (isSpMax ? ` <span class="star-max-badge">MAX <i class="fa-solid fa-check"></i></span>` : '');

        // تحديث شريط التقدم ليصبح Collection Level
        document.getElementById("legacyData").innerHTML = `
        <h3 style="color:var(--text-muted);"><i class="fa-solid fa-id-card"></i> Account Profile</h3>
        <div class="cr-xp-wrapper">
            <div class="cr-xp-fill" style="width: ${collPct}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div>
            <div class="cr-xp-text" style="z-index: 2;">${collLevel.toLocaleString()} / ${nextCollMilestone.toLocaleString()}</div>
            <div class="cr-xp-level" style="background: var(--accent-purple); color: #fff;"><span>${kingTower}</span></div>
        </div>
        <div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:5px; letter-spacing:1px; font-weight:bold;">
            COLLECTION LEVEL (NEXT REWARD IN ${nextCollMilestone - collLevel})
        </div>
        <div style="display: flex; justify-content: space-around; text-align: center; margin-top: 15px; background: rgba(0,0,0,0.2); border-radius:8px; padding:15px 5px;">
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${years}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">YEARS</span></div>
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${String(months).padStart(2, '0')}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">MONTHS</span></div>
            <div><span style="font-size:20px; font-weight:700; color:var(--text-main);">${String(days).padStart(2, '0')}</span><br><span style="font-size:9px; color:var(--text-muted); letter-spacing:1px;">DAYS</span></div>
        </div>`;

        document.getElementById("financialBox").innerHTML = `<h3><i class="fa-solid fa-coins" style="color:var(--accent-gold)"></i> Financial Status</h3>
        <table class="info-table"><tr><td>Invested</td><td style="text-align:right;" class="green-text">${spent.toLocaleString()}</td><td style="text-align:right;">${(spent / totalGold * 100).toFixed(1)}%</td></tr>
        <tr><td>Remaining</td><td style="text-align:right;" class="red-text">${rem.toLocaleString()}</td><td style="text-align:right;">${(rem / totalGold * 100).toFixed(1)}%</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td><strong style="color:var(--text-main);">TOTAL</strong></td><td style="text-align:right;" class="gold-text">${totalGold.toLocaleString()}</td><td style="text-align:right;">100%</td></tr></table>`;

        document.getElementById("collectionBox").innerHTML = `<h3><i class="fa-solid fa-layer-group" style="color:var(--accent-blue)"></i> Card Collection</h3>
        <table class="info-table"><tr><td>Collected</td><td style="text-align:right;" class="green-text">${cardCollTotal.toLocaleString()}</td><td style="text-align:right;">${(cardCollTotal / cardReqTotal * 100).toFixed(1)}%</td></tr>
        <tr><td>Missing</td><td style="text-align:right;" class="red-text">${(cardReqTotal - cardCollTotal).toLocaleString()}</td><td style="text-align:right;">${((cardReqTotal - cardCollTotal) / cardReqTotal * 100).toFixed(1)}%</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td><strong style="color:var(--text-main);">TOTAL</strong></td><td style="text-align:right; color:var(--text-main); font-weight:bold;">${cardReqTotal.toLocaleString()}</td><td style="text-align:right;">100%</td></tr></table>`;

        let totalPendingUpgrades = globalResults.reduce((sum, r) => sum + (r.possibleUpgrades || 0), 0);

        document.getElementById("playerBox").innerHTML = `<h3><i class="fa-solid fa-chart-simple" style="color:var(--accent-purple)"></i> Player Stats</h3>
        <table class="info-table">
        <tr><td>Star Points</td><td style="text-align:right;" class="gold-text">${spDisplay}</td></tr>
        <tr><td>Maxed Cards</td><td style="text-align:right;" class="green-text">${maxedCount} / ${globalResults.length}</td></tr>
        <tr><td>Unowned</td><td style="text-align:right;" class="red-text">${unownedCount}</td></tr>
        </table>`;

        // ==========================================
        // 🔥 محرك محفظة الإنجاز الشاملة (Progression Matrix) 🔥
        // ==========================================
        let totalGameUpgrades = 0;
        let completedGameUpgrades = 0;
        let readyRarity = { common: 0, rare: 0, epic: 0, legendary: 0, champion: 0 };

        // 1. حساب إجمالي الترقيات في اللعبة وما تم إنجازه
        globalResults.forEach(r => {
            let possibleForThisCard = MAX_LEVEL - START_LVL[r.rarityKey];
            totalGameUpgrades += possibleForThisCard;
            if (r.status !== "Not Owned") {
                completedGameUpgrades += (r.actualLvl - START_LVL[r.rarityKey]);
            }
        });

        // 2. فرز الترقيات الجاهزة حسب الندرة
        readyCards.forEach(c => readyRarity[c.rarityKey]++);

        // 3. حساب النسبة المئوية لختم اللعبة
        let gameProgressPct = (completedGameUpgrades / totalGameUpgrades) * 100;

        // 4. استخراج البطاقات المفقودة (القائمة السوداء)
        let missingHtml = "";
        let unownedCardsArr = globalResults.filter(c => c.status === "Not Owned");
        if (unownedCardsArr.length > 0) {
            missingHtml = unownedCardsArr.map(c => `<img src="${c.imgUrl}" style="width:35px; height:42px; object-fit:contain; margin-right:5px; margin-bottom:5px; border-radius:4px; filter: grayscale(100%) opacity(0.6); border: 1px solid var(--accent-red);" title="${c.cleanName}">`).join("");
        } else {
            missingHtml = `<span style="color:var(--accent-green); font-size:12px; font-weight:bold;"><i class="fa-solid fa-check-double"></i> All Cards Unlocked!</span>`;
        }

        // 5. بناء واجهة الصندوق
        let progressionHTML = `
        <h3 style="color:var(--accent-blue); margin-bottom: 20px; font-size: 1.1rem;"><i class="fa-solid fa-trophy"></i> Master Progression Portfolio</h3>
        
        <div style="margin-bottom: 25px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:var(--text-main);">
                <span><i class="fa-solid fa-bars-progress"></i> Game Completion (Total Upgrades)</span>
                <span class="gold-text" style="font-weight:900; font-size:14px;">${completedGameUpgrades.toLocaleString()} / ${totalGameUpgrades.toLocaleString()} (${gameProgressPct.toFixed(1)}%)</span>
            </div>
            <div class="table-progress-bg" style="height: 14px; background: rgba(255,255,255,0.05);">
                <div class="table-progress-fill" style="width:${gameProgressPct}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #d946ef);"></div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            
            <!-- قسم تفصيل الترقيات الجاهزة -->
            <div style="border-right: 1px solid var(--border-color); padding-right: 15px;">
                <h4 style="color:var(--text-muted); font-size:11px; margin-bottom:12px; letter-spacing:1px;"><i class="fa-solid fa-bolt" style="color:var(--accent-gold);"></i> READY UPGRADES (${readyCards.length})</h4>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px dashed rgba(255,255,255,0.05);"><span>Common</span> <span style="color:#bdc3c7; font-weight:800;">${readyRarity.common}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px dashed rgba(255,255,255,0.05);"><span>Rare</span> <span style="color:#e67e22; font-weight:800;">${readyRarity.rare}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px dashed rgba(255,255,255,0.05);"><span>Epic</span> <span style="color:#9b59b6; font-weight:800;">${readyRarity.epic}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px dashed rgba(255,255,255,0.05);"><span>Legendary</span> <span style="color:#00cec9; font-weight:800;">${readyRarity.legendary}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;"><span>Champion</span> <span style="color:var(--accent-gold); font-weight:800;">${readyRarity.champion}</span></div>
            </div>

            <!-- قسم القائمة السوداء والفجوات -->
            <div>
                <h4 style="color:var(--text-muted); font-size:11px; margin-bottom:12px; letter-spacing:1px;"><i class="fa-solid fa-lock" style="color:var(--text-muted);"></i> MISSING CARDS</h4>
                <div style="display:flex; flex-wrap:wrap; margin-bottom: 20px;">
                    ${missingHtml}
                </div>
                
                <h4 style="color:var(--text-muted); font-size:11px; margin-bottom:10px; letter-spacing:1px;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red);"></i> DEEP GAPS (Lvl ${lowestLvl})</h4>
                <div style="font-size:12px; color:var(--text-main); line-height:1.6;">
                    You have <span style="color:var(--accent-red); font-weight:bold;">${countLowest}</span> cards stuck at the absolute minimum level (${lowestLvl}).<br>
                    Closing this gap is your primary priority to balance Clan Wars matchmaking.
                </div>
            </div>
        </div>
        `;
        document.getElementById("progressionMatrix").innerHTML = progressionHTML;
        // ==========================================

        let bdHTML = `<h3><i class="fa-solid fa-chart-pie"></i> Rarity Breakdown</h3>
        <table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">RARITY</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">INV GOLD</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">REM GOLD</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">CARDS</th></tr>`;
        const addRow = (label, obj) => { bdHTML += `<tr><td style="color:var(--text-main);">${label}</td><td style="text-align:right;">${obj.gs.toLocaleString()}</td><td style="text-align:right;">${obj.gr.toLocaleString()}</td><td style="text-align:right;">${(obj.cs / obj.ct * 100).toFixed(1)}%</td></tr>`; };
        addRow("Common", rarityStats.common); addRow("Rare", rarityStats.rare); addRow("Epic", rarityStats.epic); addRow("Legendary", rarityStats.legendary); addRow("Champion", rarityStats.champion);
        bdHTML += `<tr style="border-top: 1px solid var(--border-color);"><td style="color:var(--accent-red); font-weight:bold;">Towers</td><td style="text-align:right; font-weight:bold;">${towerS.toLocaleString()}</td><td style="text-align:right; font-weight:bold;">${towerR.toLocaleString()}</td><td style="text-align:right; font-weight:bold;">${(towerCS / towerCT * 100).toFixed(1)}%</td></tr></table>`;
        document.getElementById("breakdownData").innerHTML = bdHTML;

        document.getElementById("strategyData").innerHTML = `<table class="info-table">
        <tr><td>Lowest Level</td><td style="text-align:right;" class="gold-text">${lowestLvl}</td><td style="text-align:right;">(x${countLowest})</td></tr>
        <tr><td>Total Cost</td><td style="text-align:right;" class="red-text">-${totalGoldCostForMass.toLocaleString()}</td><td style="text-align:right;"></td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td>Coll. Lvl Gain</td><td style="text-align:right;" class="green-text">+${countLowest}</td><td style="text-align:right;"></td></tr></table>`;

        document.getElementById("ladderPlanText").innerText = ladderPlanStr;
        document.getElementById("instantPlanText").innerText = instantPlanStr;

        let upgradable = globalResults.filter(r => r.actualLvl < MAX_LEVEL && r.status !== "Not Owned");
        upgradable.sort((a, b) => b.pctToNext - a.pctToNext);
        let upHTML = `
            <h3 style="color:var(--accent-green);"><i class="fa-solid fa-arrow-trend-up"></i> Top Upgrades 
                <div class="tooltip-container"><i class="fa-solid fa-circle-info tooltip-icon"></i><span class="tooltip-text">Closest cards to having enough copies for next level.</span></div>
            </h3>
            <table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">CARD</th><th style="text-align:center; color:var(--text-muted); font-size:10px;">LVL</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">PROG</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">COST</th></tr>`;
        for (let i = 0; i < 3; i++) {
            if (upgradable[i]) {
                let next = upgradable[i].actualLvl + 1;
                upHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${upgradable[i].imgUrl}" class="card-img" style="width:24px; height:28px;" onerror="this.style.display='none'"> <span>${upgradable[i].cleanName}</span></td><td style="text-align:center;">${next}</td><td style="text-align:right;">${getProgressBar(upgradable[i].pctToNext, '#22c55e')}</td><td style="text-align:right;" class="gold-text">${(GOLD_LADDER[next] / 1000).toFixed(0)}k</td></tr>`;
            } else { upHTML += `<tr><td>-</td><td style="text-align:center;">-</td><td style="text-align:right;">-</td><td style="text-align:right;">-</td></tr>`; }
        }
        document.getElementById("topUpgradesData").innerHTML = upHTML + `</table>`;

        let deckIDs = new Set();
        if (pData.currentDeck) pData.currentDeck.forEach(c => deckIDs.add(c.id));
        if (pData.currentDeckSupportCards) pData.currentDeckSupportCards.forEach(c => deckIDs.add(c.id));

        window.lastDeckIDs = deckIDs;
        window.currentPlayerTag = tag;

        let myDeckCards = globalResults.filter(r => deckIDs.has(r.id));
        let deckGoldNeeded = 0;
        myDeckCards.forEach(c => deckGoldNeeded += c.rem);

        const isEpicSundayDeck = (new Date().getDay() === 0);
        let permittedDeckRarities = isEpicSundayDeck ? ["common", "rare", "epic"] : ["common", "rare"];

        let deckPriority = myDeckCards.filter(c =>
            c.actualLvl < MAX_LEVEL && permittedDeckRarities.includes(c.rarityKey) && c.pctToNext < 1
        ).sort((a, b) => {
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
            let lvlColor = c.actualLvl === MAX_LEVEL ? "color: transparent; background: linear-gradient(90deg, #fbcfe8, #d946ef); -webkit-background-clip: text; background-clip: text; font-weight:800;" : "color: var(--text-main);"; deckHTML += `<div style="border:1px solid ${borderColor}; padding:8px 5px; border-radius:8px; text-align:center; width:65px; background: rgba(0,0,0,0.2);">
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
        for (let i = 0; i < 3; i++) {
            if (deckPriority[i]) {
                daHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${deckPriority[i].imgUrl}" class="card-img" style="width:24px; height:28px;"> <span>${deckPriority[i].cleanName}</span></td>
                 <td style="text-align:center;">${deckPriority[i].actualLvl}</td>
                 <td style="text-align:right;" class="gold-text">${deckPriority[i].rem > 0 ? (deckPriority[i].rem / 1000).toFixed(0) + 'k' : 'Cards'}</td>
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
                while (reqList.length < 3 && potentialCards.length > 0) { reqList.push(potentialCards.shift()); }
                break;
            }
        }

        let accountAdvisorBox = document.getElementById("advisorData");
        accountAdvisorBox.className = isEpicSunday ? "info-box epic-sunday-glow" : "info-box";
        let titleColor = isEpicSunday ? 'var(--accent-purple)' : 'var(--accent-blue)';
        let advHTML = `<h3 style="color:${titleColor};"><i class="fa-solid fa-lightbulb"></i> Account Advisor <div class="tooltip-container"><i class="fa-solid fa-circle-info tooltip-icon"></i><span class="tooltip-text">Finds lowest level cards needing copies from clan.</span></div></h3>`;
        if (isEpicSunday) advHTML += `<div class="epic-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Epic Sunday: Prioritizing Epic Cards!</div>`;
        advHTML += `<table class="info-table"><tr><th style="text-align:left; color:var(--text-muted); font-size:10px;">CARD</th><th style="text-align:center; color:var(--text-muted); font-size:10px;">LVL</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">STOCK</th><th style="text-align:right; color:var(--text-muted); font-size:10px;">READY %</th></tr>`;
        for (let i = 0; i < 3; i++) {
            if (reqList[i]) {
                advHTML += `<tr><td class="card-cell" style="min-width:auto; gap:8px;"><img src="${reqList[i].imgUrl}" class="card-img" style="width:24px; height:28px;" onerror="this.style.display='none'"> <span>${reqList[i].cleanName}</span></td>
                <td style="text-align:center;">${reqList[i].actualLvl}</td>
                <td style="text-align:right;">${reqList[i].stock}</td>
                <td style="text-align:right; width:80px;">${getProgressBar(getScore(reqList[i]), '#3b82f6')}</td></tr>`;
            } else {
                advHTML += `<tr><td style="color:var(--text-muted)">-</td><td style="text-align:center; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">-</td><td style="text-align:right; color:var(--text-muted)">READY</td></tr>`;
            }
        }
        accountAdvisorBox.innerHTML = advHTML + `</table>`;

        if (chartWinLoss) chartWinLoss.destroy();
        chartWinLoss = new Chart(document.getElementById('winLossChart'), { type: 'doughnut', data: { labels: ['Wins', 'Losses', 'Draws'], datasets: [{ data: [wins, losses, draws], backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Battle Performance', color: '#f4f4f5' }, legend: { display: false } }, cutout: '65%' } });

        let labelsLevel = []; let dataLevel = [];
        for (let i = 1; i <= 16; i++) { if (i >= Math.min(globalMinLevel, 10) || levelCounts[i] > 0) { labelsLevel.push("Lvl " + i); dataLevel.push(levelCounts[i]); } }
        if (chartLevels) chartLevels.destroy();
        chartLevels = new Chart(document.getElementById('levelChart'), { type: 'bar', data: { labels: labelsLevel, datasets: [{ label: 'Cards', data: dataLevel, backgroundColor: '#3b82f6', borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } }, x: { ticks: { color: '#a1a1aa' }, grid: { display: false } } } } });

        if (chartGold) chartGold.destroy();
        chartGold = new Chart(document.getElementById('goldChart'), { type: 'pie', data: { labels: ['Invested Gold', 'Remaining Gold'], datasets: [{ data: [spent, rem], backgroundColor: ['#facc15', '#27272a'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Gold Progress', color: '#f4f4f5' }, legend: { display: false } } } });

        if (chartCards) chartCards.destroy();
        chartCards = new Chart(document.getElementById('cardsChart'), { type: 'doughnut', data: { labels: ['Collected', 'Miss Common', 'Miss Rare', 'Miss Epic', 'Miss Leg.', 'Miss Champ.'], datasets: [{ data: [cardCollTotal, missingByRarity.common, missingByRarity.rare, missingByRarity.epic, missingByRarity.legendary, missingByRarity.champion], backgroundColor: ['#3b82f6', '#94a3b8', '#f97316', '#a855f7', '#06b6d4', '#facc15'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Card Collection', color: '#f4f4f5' }, legend: { display: false } }, cutout: '65%' } });

        // ==========================================
        // جلب بيانات المعارك وحساب التشكيلة الأقوى
        // ==========================================
        let bRes = await fetch(`${PROXY_BASE}/battlelog?tag=${tag}`);
        let battleStats = { wins: 0, losses: 0, draws: 0, bestDeck: null, bestWinRate: 0 };

        if (bRes.ok) {
            let bData = await bRes.json();
            let deckHashStats = {};

            bData.forEach(battle => {
                if (battle.type !== "PvP" && battle.type !== "pathOfLegend") return;

                let myTeam = battle.team[0];
                let oppTeam = battle.opponent[0];

                let deckHash = myTeam.cards.map(c => c.name).sort().join(",");
                if (!deckHashStats[deckHash]) deckHashStats[deckHash] = { wins: 0, matches: 0, cards: myTeam.cards };

                deckHashStats[deckHash].matches++;
                if (myTeam.crowns > oppTeam.crowns) deckHashStats[deckHash].wins++;
            });

            Object.values(deckHashStats).forEach(d => {
                let wr = (d.wins / d.matches) * 100;
                if (d.matches >= 3 && wr > battleStats.bestWinRate) {
                    battleStats.bestWinRate = wr;
                    battleStats.bestDeck = d.cards;
                }
            });
        }

        // ==========================================
        // إزالة الدونات وعرض واجهة التشكيلة
        // ==========================================
        if (chartXp) chartXp.destroy();

        let bestDeckUI = `<h3 style="color:#f4f4f5; text-align:center; margin-bottom:15px; font-size: 13px; font-family: 'Inter', sans-serif;"><i class="fa-solid fa-crown" style="color:var(--accent-gold);"></i> Best Performing Deck</h3>`;

        if (battleStats && battleStats.bestDeck) {
            bestDeckUI += `<div style="text-align:center; margin-bottom: 15px;">
                <span style="color:#22c55e; font-size: 28px; font-weight: 900;">${battleStats.bestWinRate.toFixed(1)}%</span>
                <span style="color:#a1a1aa; font-size: 11px; font-weight: bold; letter-spacing: 1px;"> WIN RATE</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">`;

            battleStats.bestDeck.forEach(c => {
                bestDeckUI += `<img src="${getCardImageUrl(c.name)}" style="width:40px; height:48px; object-fit:contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onerror="this.style.display='none'">`;
            });

            bestDeckUI += `</div><div style="text-align:center; color:#71717a; font-size:10px; margin-top:12px;">Analyzed from last 50 PvP/Ranked battles</div>`;
        } else {
            bestDeckUI += `<div style="text-align:center; color:#71717a; margin-top: 40px; font-size:12px;">Not enough data<br>(Need at least 3 matches with the same deck)</div>`;
        }

        // التعديل الجوهري: استهداف الصندوق الجديد الذي صممناه في HTML
        let deckContainer = document.getElementById('bestDeckContainer');
        if (deckContainer) deckContainer.innerHTML = bestDeckUI;

        renderMainTable();
        statusMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Analysis Complete!`;
        statusMsg.style.color = "var(--accent-green)";
        dash.style.opacity = "1";
        calculateHolisticAI();
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
        if (currentActiveFilter === 'evo') return r.isEvo;
        if (currentActiveFilter === 'hero') return r.isHero;
        return r.rarityKey === currentActiveFilter;
    });

    filteredResults.sort((a, b) => {
        if (a.isTower !== b.isTower) return b.isTower - a.isTower;
        if (a.isTower && b.isTower) {
            let aOwned = a.status !== "Not Owned" ? 1 : 0; let bOwned = b.status !== "Not Owned" ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned;
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];
        } else {
            // 1. الأولوية الأولى: ترتيب الندرة (للحفاظ على تماسك الفئات)
            if (RARITY_RANK[a.rarityKey] !== RARITY_RANK[b.rarityKey]) return RARITY_RANK[a.rarityKey] - RARITY_RANK[b.rarityKey];

            // 2. الأولوية الثانية: تنزيل البطاقات المطفية لآخر فئتها فقط
            if (currentActiveFilter === 'evo' || currentActiveFilter === 'hero') {
                let aUnlocked = a.evoLevel > 0 ? 1 : 0;
                let bUnlocked = b.evoLevel > 0 ? 1 : 0;
                if (aUnlocked !== bUnlocked) return bUnlocked - aUnlocked;
            }

            // 3. الأولوية الثالثة: البطاقات الغير مملوكة أصلاً باللعبة
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

        if (currentActiveFilter === 'all' || currentActiveFilter === 'evo' || currentActiveFilter === 'hero') {
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
        else if (currentActiveFilter !== 'all' && currentActiveFilter !== 'evo' && currentActiveFilter !== 'hero') { currentCategoryKey = newCategoryKey; }

        // --- تحديد الصورة الذكي ---
        let displayImg = r.imgUrl;
        let isLockedSpecial = false;

        if (currentActiveFilter === 'evo' && r.isEvo) {
            displayImg = getAdvancedCardImage(r.cleanName, false, true);
            if (r.evoLevel === 0) isLockedSpecial = true;
        } else if (currentActiveFilter === 'hero' && r.isHero) {
            displayImg = getAdvancedCardImage(r.cleanName, true, false);
            if (r.evoLevel === 0) isLockedSpecial = true;
        } else if (currentActiveFilter === 'all') {
            let unlockedHero = r.isHero && r.evoLevel > 0;
            let unlockedEvo = r.isEvo && r.evoLevel > 0;
            if (unlockedHero || unlockedEvo) {
                displayImg = getAdvancedCardImage(r.cleanName, unlockedHero, unlockedEvo);
            }
        }

        // إعطاء مظهر التعتيم واللون الرمادي للبطاقات الغير مفعلة
        let imgStyle = isLockedSpecial ? "width:38px; height:45px; object-fit:contain; opacity:0.4; filter:grayscale(100%);" : "width:38px; height:45px; object-fit:contain;";

        let isElite = (r.actualLvl === MAX_LEVEL);
        let rowClass = isElite ? "class='elite-max-row'" : "";
        let nameStyle = isElite ? "class='elite-text'" : "";
        let rarityColor = r.rarityKey === 'epic' ? 'var(--accent-purple)' : r.rarityKey === 'legendary' ? '#00cec9' : r.rarityKey === 'champion' ? 'var(--accent-gold)' : r.rarityKey === 'rare' ? '#e67e22' : '#bdc3c7';
        let isLockedClass = (r.status === "Not Owned") ? "locked-card" : "";

        let displayPctNext = r.status === "Not Owned" ? "-" : getProgressBar(r.pctToNext, r.pctToNext >= 1 ? '#22c55e' : '#3b82f6');
        let displayPctMax = r.status === "Not Owned" ? "-" : getProgressBar(r.pctToMax, isElite ? '#d946ef' : '#facc15');

        tableHTML += `<tr ${rowClass} data-rarity="${r.rarityKey}" data-istower="${r.isTower}">
            <td class="card-cell ${isLockedClass}"><img src="${displayImg}" class="card-img" style="${imgStyle}" onerror="this.src='${r.imgUrl}'"> <span ${nameStyle}>${r.cleanName}</span></td>
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
// ==========================================
// 🔥 3. عرض النتائج والميزانية (UI & Enforcer) 🔥
// ==========================================
// ==========================================
// 🔥 3. عرض النتائج والميزانية (UI & Enforcer) 🔥
// ==========================================
