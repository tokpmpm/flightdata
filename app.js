// --- START OF FILE app.js (已修改版本) ---

window.addEventListener('load', function() {
    
    // --- 全域變數和設定 ---
    const airportSelector = document.getElementById('airportSelector');
    const destinationSelector = document.getElementById('destinationSelector');
    const loader = document.getElementById('loader');
    
    let months = []; 
    let resizeTimeout = null;

    // 航空公司代表色設定
    const airlineColors = {
        "中華": '#C6003B', "長榮": '#00A99D', "星宇": '#DAA520',
        "台灣虎航": '#FF8C00', "國泰": '#006400', "樂桃": '#FF69B4',
        "捷星日本": '#1f77b4', "泰越捷": '#D62728', "全亞洲": '#9467bd',
        "馬印": '#8c564b', "日本": '#40E0D0', "泰獅": '#FDB913',
        "聯合": '#002244', "全日空": '#02529C', "酷航": '#FCD116',
        "泰亞洲": '#D41428'
    };
    
    // [新增] 年份代表色設定
    const yearColors = {
        "2024": 'rgba(54, 162, 235, 0.8)', // 藍色
        "2025": 'rgba(255, 99, 132, 0.8)'  // 紅色
    };


    // --- 主要執行函式 ---
    function main() {
        showLoader();
        requestAnimationFrame(() => {
            preprocessData();
            initializeSelectors();
            
            const initialAirport = airportSelector.value;
            const initialDestination = populateDestinationSelector(initialAirport);
            updateDashboard(initialAirport, initialDestination);

            airportSelector.disabled = false;
            destinationSelector.disabled = false;
            hideLoader();
        });
    }

    // --- 資料預處理 ---
    function preprocessData() {
        for (const airport in flightData) {
            for (const destination in flightData[airport]) {
                for (const airline in flightData[airport][destination]) {
                    flightData[airport][destination][airline].forEach(d => {
                        d.loadFactor = d.seats > 0 ? d.passengers / d.seats : 0;
                    });
                }
            }
        }
        let allDataPoints = [];
        Object.values(flightData).forEach(destinations => {
            Object.values(destinations).forEach(airlines => {
                Object.values(airlines).forEach(dataPoints => allDataPoints.push(...dataPoints));
            });
        });
        const monthSet = new Set(allDataPoints.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`));
        months = Array.from(monthSet).sort();
    }
    
    // --- 初始化與事件處理 ---
    function initializeSelectors() {
        const airportMapping = { "所有": "台灣所有機場", "TPE": "桃園國際機場", "KHH": "高雄國際機場", "TSA": "松山機場", "RMQ": "台中機場" };
        const allAirports = Object.keys(flightData).sort((a, b) => {
            if (a === '所有') return -1; if (b === '所有') return 1;
            return a.localeCompare(b);
        });

        allAirports.forEach(airport => {
            const option = document.createElement('option');
            option.value = airport;
            option.textContent = airportMapping[airport] || airport;
            airportSelector.appendChild(option);
        });

        airportSelector.addEventListener('change', () => {
            const selectedAirport = airportSelector.value;
            const defaultDestination = populateDestinationSelector(selectedAirport);
            updateDashboard(selectedAirport, defaultDestination);
        });

        destinationSelector.addEventListener('change', () => {
            updateDashboard(airportSelector.value, destinationSelector.value);
        });
    }

    function populateDestinationSelector(airport) {
        const currentDestination = destinationSelector.value;
        destinationSelector.innerHTML = '';
        const destinations = Object.keys(flightData[airport]).sort();
        destinations.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest;
            option.textContent = dest;
            destinationSelector.appendChild(option);
        });
        if (destinations.includes(currentDestination)) {
            destinationSelector.value = currentDestination;
        }
        return destinationSelector.value;
    }

    // --- 儀表板更新 ---
    function updateDashboard(airport, destination) {
        const currentData = flightData[airport]?.[destination];
        if (!currentData) { return; }
        
        const airlinesOnRoute = Object.keys(currentData).sort();
        const airportMapping = { "所有": "台灣所有機場", "TPE": "桃園國際機場", "KHH": "高雄國際機場", "TSA": "松山機場", "RMQ": "台中機場" };
        let airportName = airportMapping[airport] || airport;

        document.getElementById('loadFactorChartTitle').textContent = `從【${airportName}】飛往【${destination}】- 各航空公司載客率趨勢`;
        document.getElementById('passengerBarChartTitle').textContent = `從【${airportName}】飛往【${destination}】- 每月總載客人數 (堆疊)`;
        // [修改] 更新 YoY 圖表標題
        document.getElementById('yoyPassengerChartTitle').textContent = `從【${airportName}】飛往【${destination}】- 每月總載客人數 (YoY對比)`;
        document.getElementById('detailsTableTitle').textContent = `從【${airportName}】飛往【${destination}】- 航空公司詳細月度數據`;

        createOrUpdateCharts(currentData, airlinesOnRoute);
        createAirlineTabs(currentData, airlinesOnRoute);
    }
    
    // --- 圖表繪製與更新 ---
    function createOrUpdateCharts(data, airlines) {
        createInteractiveLegend(airlines.filter(a => a !== '平均載客率'), 'loadFactorChart');
        // [新增] 建立 YoY 圖表的圖例
        createYoYLegend(['2024', '2025'], 'yoyPassengerChart');
        
        // --- 載客率圖表數據生成 (邏輯不變) ---
        const loadFactorTraces = [];
        const allVisibleYValues = [];
        const avgLoadFactors = months.map(month => {
            let totalPassengers = 0, totalSeats = 0;
            airlines.forEach(airline => {
                const airlineDataMap = new Map(data[airline].map(d => [`${d.year}-${String(d.month).padStart(2, '0')}`, d]));
                const monthData = airlineDataMap.get(month);
                if (monthData && monthData.passengers > 0) { totalPassengers += monthData.passengers; totalSeats += monthData.seats; }
            });
            return totalSeats > 0 ? totalPassengers / totalSeats : null;
        });

        airlines.forEach(airline => {
            const airlineColor = airlineColors[airline] || '#333';
            const airlineDataMap = new Map(data[airline].map(d => [`${d.year}-${String(d.month).padStart(2, '0')}`, d]));
            const yValues = months.map(month => {
                const d = airlineDataMap.get(month);
                return (d && d.passengers > 0) ? d.loadFactor : null;
            });
            allVisibleYValues.push(...yValues.filter(v => v !== null && isFinite(v)));
            loadFactorTraces.push({
                x: months, y: yValues, mode: 'lines+markers', name: airline,
                hovertemplate: `<b>${airline}</b><br>載客率: %{y:.2%}<extra></extra>`, connectgaps: false,
                line: { color: airlineColor, width: 2.5 },
                marker: { symbol: 'circle', color: '#ffffff', size: 8, line: { color: airlineColor, width: 2 } }
            });
        });
        
        allVisibleYValues.push(...avgLoadFactors.filter(v => v !== null && isFinite(v)));
        loadFactorTraces.push({
            x: months, y: avgLoadFactors, mode: 'lines+markers', name: '平均載客率',
            hovertemplate: '<b>平均載客率</b><br>%{y:.2%}<extra></extra>', connectgaps: false,
            line: { dash: 'dashdot', color: 'grey', width: 4 },
            marker: { symbol: 'circle', color: '#ffffff', size: 8, line: { color: 'grey', width: 2 } }
        });

        let yAxisRange = [0.4, 1.1]; 
        if (allVisibleYValues.length > 0) {
            const dataMin = Math.min(...allVisibleYValues);
            const dataMax = Math.max(...allVisibleYValues);
            const lowerBound = Math.max(0, dataMin - 0.10); 
            const upperBound = Math.min(1.2, dataMax + 0.10);
            if (upperBound > lowerBound) { yAxisRange = [lowerBound, upperBound]; }
        }
        
        const loadFactorLayout = {
            plot_bgcolor: '#ffffff', paper_bgcolor: '#ffffff', font: { color: '#333' },
            xaxis: { title: '月份', tickformat: '%Y-%m', gridcolor: '#e5e5e5', automargin: true },
            yaxis: { title: '載客率', tickformat: '.0%', range: yAxisRange, gridcolor: '#e5e5e5', automargin: true },
            hovermode: 'x unified', showlegend: false, 
            margin: { t: 40, b: 60, l: 60, r: 40 },
            autosize: true,
            responsive: true
        };

        // --- 載客人數圖表數據生成 (邏輯不變) ---
        const monthlyTotals = months.map(month => {
             return airlines.reduce((sum, airline) => {
                const airlineDataMap = new Map(data[airline].map(d => [`${d.year}-${String(d.month).padStart(2, '0')}`, d]));
                const monthData = airlineDataMap.get(month);
                return sum + (monthData ? monthData.passengers : 0);
            }, 0);
        });
        const passengerTraces = airlines.map(airline => {
            const airlineDataMap = new Map(data[airline].map(d => [`${d.year}-${String(d.month).padStart(2, '0')}`, d]));
            const yValues = months.map(month => {
                const d = airlineDataMap.get(month);
                return (d && d.passengers > 0) ? d.passengers : null;
            });
            const customData = months.map((month, i) => {
                const d = airlineDataMap.get(month);
                return (d && monthlyTotals[i] > 0) ? d.passengers / monthlyTotals[i] : 0;
            });
            return {
                x: months, y: yValues, customdata: customData, name: airline, type: 'bar',
                hovertemplate: `<b>%{data.name}</b><br>載客人數: %{y:,}<br>佔該月比例: %{customdata:.2%}<extra></extra>`,
                marker: { color: airlineColors[airline] || '#333' }
            };
        });

        const passengerLayout = {
            barmode: 'stack', plot_bgcolor: '#ffffff', paper_bgcolor: '#ffffff',
            yaxis: { title: '總載客人數', gridcolor: '#e5e5e5', automargin: true },
            xaxis: { title: '月份', tickformat: '%Y-%m', automargin: true }, 
            hovermode: 'x unified',
            legend: { orientation: 'h', y: 1.15, yanchor: 'bottom', x: 0.5, xanchor: 'center', font: {size: 10} },
            margin: { t: 80, b: 60, l: 60, r: 40 },
            autosize: true,
            responsive: true
        };
        
        // ========================[ 新增的 YoY 圖表邏輯 START ]========================
        const yoyMonthlyTotals = {};
        airlines.forEach(airline => {
            data[airline].forEach(d => {
                const monthKey = String(d.month).padStart(2, '0');
                const yearKey = String(d.year);
                if (!yoyMonthlyTotals[monthKey]) {
                    yoyMonthlyTotals[monthKey] = { '2024': 0, '2025': 0 };
                }
                if (yearKey === '2024' || yearKey === '2025') {
                    yoyMonthlyTotals[monthKey][yearKey] += d.passengers;
                }
            });
        });

        const yoyMonths = Object.keys(yoyMonthlyTotals).sort();
        const yoyLabels = yoyMonths.map(m => `${parseInt(m, 10)}月`);
        
        const yoyTraces = Object.keys(yearColors).map(year => {
            return {
                x: yoyLabels,
                y: yoyMonths.map(m => yoyMonthlyTotals[m][year] || null),
                name: `${year}年`,
                type: 'bar',
                marker: { color: yearColors[year] },
                hovertemplate: `<b>${year}年 %{x}</b><br>總載客數: %{y:,}<extra></extra>`
            };
        });

        const yoyLayout = {
            barmode: 'group', // 關鍵：將長條圖並排
            plot_bgcolor: '#ffffff', paper_bgcolor: '#ffffff', font: { color: '#333' },
            xaxis: { title: '月份', automargin: true },
            yaxis: { title: '總載客人數', gridcolor: '#e5e5e5', automargin: true },
            hovermode: 'x unified',
            legend: { orientation: 'h', y: 1.1, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
            showlegend: false, // 我們使用互動式圖例，所以隱藏 Plotly 的
            margin: { t: 40, b: 60, l: 60, r: 40 },
            autosize: true,
            responsive: true
        };
        // ========================[ 新增的 YoY 圖表邏輯 END ]==========================

        // 使用 newPlot 而不是 react 來確保完全重新渲染
        Plotly.newPlot('loadFactorChart', loadFactorTraces, loadFactorLayout, { 
            responsive: true,
            displayModeBar: false
        });
        Plotly.newPlot('passengerBarChart', passengerTraces, passengerLayout, { 
            responsive: true,
            displayModeBar: false
        });
        // [新增] 繪製新的 YoY 圖表
        Plotly.newPlot('yoyPassengerChart', yoyTraces, yoyLayout, {
            responsive: true,
            displayModeBar: false
        });

        // 改進的圖表尺寸重新計算策略
        const resizeAllCharts = () => {
            Plotly.Plots.resize('loadFactorChart');
            Plotly.Plots.resize('passengerBarChart');
            Plotly.Plots.resize('yoyPassengerChart'); // [修改] 加入 YoY 圖表
        };
        
        requestAnimationFrame(resizeAllCharts);
        setTimeout(resizeAllCharts, 100);
        setTimeout(resizeAllCharts, 300);
    }
    
    // --- 其他 UI 函式 ---
    function createInteractiveLegend(airlines, chartDivId){ 
        const legendContainer=document.getElementById("interactiveLegend");
        legendContainer.innerHTML="";
        const createRow=()=>{
            const row=document.createElement("div");
            row.className="interactive-legend-row";
            legendContainer.appendChild(row);
            return row
        };
        const numAirlines=airlines.length;
        const useTwoRows=numAirlines>7;
        const splitPoint=useTwoRows?Math.ceil(numAirlines/2):numAirlines;
        let currentRow=createRow();
        airlines.forEach((airline,index)=>{
            if(useTwoRows&&index===splitPoint){currentRow=createRow()}
            const airlineColor=airlineColors[airline]||"#333";
            const legendItem=document.createElement("div");
            legendItem.className="legend-item";
            legendItem.dataset.traceIndex=index;
            const colorBox=document.createElement("div");
            colorBox.className="legend-color-box";
            colorBox.style.backgroundColor=airlineColor;
            const text=document.createElement("span");
            text.textContent=airline;
            legendItem.appendChild(colorBox);
            legendItem.appendChild(text);
            currentRow.appendChild(legendItem);
            legendItem.addEventListener("click",()=>{
                const traceIndex=parseInt(legendItem.dataset.traceIndex,10);
                const isInactive=legendItem.classList.toggle("inactive");
                Plotly.restyle(chartDivId,{visible:!isInactive},[traceIndex])
            })
        })
    }
    
    // ========================[ 新增的 YoY 圖例函數 START ]========================
    function createYoYLegend(years, chartDivId) {
        const legendContainer = document.getElementById("yoyLegend");
        legendContainer.innerHTML = "";
        const row = document.createElement("div");
        row.className = "interactive-legend-row";
        legendContainer.appendChild(row);

        years.forEach((year, index) => {
            const yearColor = yearColors[year] || "#333";
            const legendItem = document.createElement("div");
            legendItem.className = "legend-item";
            legendItem.dataset.traceIndex = index;
            
            const colorBox = document.createElement("div");
            colorBox.className = "legend-color-box";
            colorBox.style.backgroundColor = yearColor;
            
            const text = document.createElement("span");
            text.textContent = `${year}年`;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(text);
            row.appendChild(legendItem);

            legendItem.addEventListener("click", () => {
                const traceIndex = parseInt(legendItem.dataset.traceIndex, 10);
                const isInactive = legendItem.classList.toggle("inactive");
                Plotly.restyle(chartDivId, { visible: !isInactive }, [traceIndex]);
            });
        });
    }
    // ========================[ 新增的 YoY 圖例函數 END ]==========================

    function createAirlineTabs(data, airlines){ 
        const tabButtonsContainer=document.getElementById("airlineTabs");
        const tabContentContainer=document.getElementById("tabContentContainer");
        tabButtonsContainer.innerHTML="";
        tabContentContainer.innerHTML="";
        airlines.forEach((airline,index)=>{
            const button=document.createElement("button");
            button.className="tab-button";
            button.textContent=airline;
            button.dataset.target=`tab-${index}`;
            const content=document.createElement("div");
            content.id=`tab-${index}`;
            content.className="tab-content";
            let tableHTML='<div class="table-wrapper"><table><tr><th>月份</th><th>飛行架次</th><th>座位總數</th><th>載客人數</th><th>載客率</th></tr>';
            const sortedAirlineData = [...data[airline]].sort((a,b) => {
                 if (a.year !== b.year) return a.year - b.year;
                 return a.month - b.month;
            });
            sortedAirlineData.forEach(d=>{
                const monthLabel=`${d.year}年${d.month}月`;
                tableHTML+=`<tr><td>${monthLabel}</td><td>${d.flights.toLocaleString()}</td><td>${d.seats.toLocaleString()}</td><td>${d.passengers.toLocaleString()}</td><td>${(d.loadFactor*100).toFixed(2)}%</td></tr>`
            });
            tableHTML+="</table></div>";
            content.innerHTML=tableHTML;
            tabButtonsContainer.appendChild(button);
            tabContentContainer.appendChild(content);
            if(index===0){
                button.classList.add("active");
                content.classList.add("active")
            }
        });
        
        // 將事件監聽器綁定在容器上，使用事件委派
        if (!tabButtonsContainer.dataset.listenerAttached) {
             tabButtonsContainer.addEventListener("click", e => {
                if (e.target.classList.contains("tab-button")) {
                    tabButtonsContainer.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
                    tabContentContainer.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                    e.target.classList.add("active");
                    document.getElementById(e.target.dataset.target).classList.add("active");
                }
            });
            tabButtonsContainer.dataset.listenerAttached = 'true';
        }
    }
    
    function showLoader() { loader.style.display = 'flex'; }
    function hideLoader() { loader.style.display = 'none'; }
    
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function handleResize() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        const resizeAction = () => {
            try {
                Plotly.Plots.resize('loadFactorChart');
                Plotly.Plots.resize('passengerBarChart');
                Plotly.Plots.resize('yoyPassengerChart'); // [修改] 加入 YoY 圖表
            } catch (error) {
                console.warn('圖表尺寸調整失敗:', error);
            }
        };
        resizeAction();
        resizeTimeout = setTimeout(resizeAction, 200);
    }

    window.addEventListener('resize', debounce(handleResize, 100));
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 300);
    });

    if (typeof flightData !== 'undefined') {
        main();
    } else {
        console.error('Flight data is not loaded!');
        alert('無法載入航班數據，請檢查 flight_data.js 檔案是否存在且格式正確。');
    }
});