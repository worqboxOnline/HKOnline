

        async function openModal(type) {
            const modal = document.getElementById('modal');
            const modalBody = document.getElementById('modal-body');
            
            modal.style.display = 'flex';
            modalBody.innerHTML = '<div class="loading-spinner">Loading...</div>';
            
            try {
                let content = '';
                switch(type) {
                    case 'traffic':
                        content = await loadTrafficData();
                        break;
                    case 'news':
                        content = await loadNewsData();
                        break;
                    case 'events':
                        content = await loadEventsData();
                        break;
                    case 'credits':
                        content = `
                            <h2>Data Sources & Credits</h2>
                            <div class="modal-section" style="padding: 20px;">
                                <div style="margin-bottom: 24px;">
                                    <h3 style="color: #667eea; font-size: 16px; margin-bottom: 8px;">Hong Kong Observatory (HKO)</h3>
                                    <p style="margin-bottom: 12px; line-height: 1.6;">Weather data, warnings, and forecasts.</p>
                                    <a href='https://www.hko.gov.hk' target='_blank' style="display: inline-block; background: #667eea; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">Visit HKO →</a>
                                </div>
                                
                                <div style="margin-bottom: 24px;">
                                    <h3 style="color: #667eea; font-size: 16px; margin-bottom: 8px;">Environmental Protection Department (EPD)</h3>
                                    <p style="margin-bottom: 12px; line-height: 1.6;">Air Quality Health Index (AQHI) and pollutant data.</p>
                                    <a href='https://www.aqhi.gov.hk' target='_blank' style="display: inline-block; background: #667eea; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">Visit EPD →</a>
                                </div>
                                
                                <div style="margin-bottom: 24px;">
                                    <h3 style="color: #667eea; font-size: 16px; margin-bottom: 8px;">South China Morning Post (SCMP)</h3>
                                    <p style="margin-bottom: 12px; line-height: 1.6;">News headlines and summaries.</p>
                                    <a href='https://www.scmp.com' target='_blank' style="display: inline-block; background: #667eea; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">Visit SCMP →</a>
                                </div>
                                
                                <p style='font-size: 11px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; line-height: 1.5;'>All data © respective providers. This dashboard is for informational purposes only – please consult official sources for health and safety advisories.</p>
                            </div>
                        `;
                        break;
                }
                modalBody.innerHTML = content;
            } catch (err) {
                console.error('Modal load error:', err);
                modalBody.innerHTML = `<div class="error-message">Failed to load data. Please try again later.</div>`;
            }
        }

        async function loadTrafficData() {
            try {
                // Using TD Special Traffic News XML
                const res = await fetch('https://resource.data.one.gov.hk/td/en/specialtrafficnews.xml');
                const xmlText = await res.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, 'application/xml');
                
                const messages = Array.from(xml.getElementsByTagName('message'));
                
                if (messages.length === 0) {
                    return '<h2>� Traffic Status</h2><div class="modal-section"><p style="text-align:center; color:#22c55e;">✓ No special traffic incidents reported</p></div>';
                }
                
                // Filter active incidents (CurrentStatus = 3 means active)
                const activeMessages = messages.filter(msg => {
                    const status = msg.getElementsByTagName('CurrentStatus')[0]?.textContent;
                    return status === '3';
                });
                
                if (activeMessages.length === 0) {
                    return '<h2>🚗 Traffic Status</h2><div class="modal-section"><p style="text-align:center; color:#22c55e;">✓ No active traffic incidents</p></div>';
                }
                
                const items = activeMessages.slice(0, 15).map((msg, idx) => {
                    const engShort = msg.getElementsByTagName('EngShort')[0]?.textContent || 
                                    msg.getElementsByTagName('EngText')[0]?.textContent || 
                                    'Traffic update';
                    const engText = msg.getElementsByTagName('EngText')[0]?.textContent || '';
                    const referenceDate = msg.getElementsByTagName('ReferenceDate')[0]?.textContent || '';
                    
                    const hasMoreDetail = engText && engText.length > engShort.length + 10;
                    const itemId = `traffic-item-${idx}`;
                    
                    return `
                        <div class="traffic-item">
                            <h4>${engShort}</h4>
                            ${hasMoreDetail ? `
                                <div id="${itemId}-full" style="display:none; margin-top:8px;">
                                    <p>${engText}</p>
                                </div>
                                <button onclick="toggleTrafficDetail('${itemId}')" id="${itemId}-btn" style="background:none; border:none; color:#667eea; cursor:pointer; font-size:12px; padding:4px 0; text-decoration:underline; font-weight:500;">
                                    Show more
                                </button>
                            ` : ''}
                            ${referenceDate ? `<p style="font-size:11px; color:#9ca3af; margin-top:8px;">${referenceDate.trim()}</p>` : ''}
                        </div>
                    `;
                }).join('');
                
                return `<h2>🚗 Special Traffic News (${activeMessages.length} active)</h2><div class="modal-section">${items}</div>`;
            } catch (err) {
                console.error('Traffic fetch failed:', err);
                return '<h2>🚗 Traffic Status</h2><div class="error-message">Unable to load traffic data. Please check your connection.</div>';
            }
        }

        async function loadNewsData() {
            try {
                // Using RTHK English RSS feed via Worker proxy
                const res = await fetch('https://purple-river-7d7a.trials-9f5.workers.dev/?feed=news');
                const xmlText = await res.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, 'application/xml');
                
                const items = Array.from(xml.getElementsByTagName('item')).slice(0, 10);
                
                if (items.length === 0) {
                    return '<h2>� Latest News</h2><div class="modal-section"><p>No news items available.</p></div>';
                }
                
                const newsItems = items.map(item => {
                    const title = item.getElementsByTagName('title')[0]?.textContent || 'Untitled';
                    const link = item.getElementsByTagName('link')[0]?.textContent || '#';
                    const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
                    const description = item.getElementsByTagName('description')[0]?.textContent || '';
                    
                    // Parse date
                    let dateStr = '';
                    if (pubDate) {
                        try {
                            const d = new Date(pubDate);
                            dateStr = d.toLocaleString('en-HK', { hour12: false });
                        } catch (e) {
                            dateStr = pubDate;
                        }
                    }
                    
                    return `
                        <div class="news-item">
                            <h4><a href="${link}" target="_blank" style="color:#667eea; text-decoration:none;">${title}</a></h4>
                            ${description ? `<p>${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>` : ''}
                            ${dateStr ? `<p class="news-time">${dateStr}</p>` : ''}
                        </div>
                    `;
                }).join('');
                
                return `<h2>📰 Latest News (SCMP)</h2><div class="modal-section">${newsItems}</div>`;
            } catch (err) {
                console.error('News fetch failed:', err);
                return '<h2>📰 Latest News</h2><div class="error-message">Unable to load news feed. This may be due to CORS restrictions. Try accessing the dashboard via HTTPS or a web server.</div>';
            }
        }

        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }

        function closeMetricModal() {
            document.getElementById('metricModal').style.display = 'none';
        }

        function openWarningModal(warningData) {
            const modal = document.getElementById('metricModal');
            const modalBody = document.getElementById('metric-modal-body');
            
            modal.style.display = 'flex';
            
            let html = `<h2>⚠️ Weather Warning</h2>`;
            html += `<div class="metric-description">`;
            html += `<h3>${warningData.name}</h3>`;
            html += `<p><strong>Issued:</strong> ${warningData.issueTime}</p>`;
            if (warningData.extra) {
                html += `<p><strong>Details:</strong> ${warningData.extra}</p>`;
            }
            html += `<p style="margin-top: 12px; color: #6b7280; font-size: 13px;">For more information, visit the <a href="https://www.hko.gov.hk" target="_blank" style="color: #667eea;">Hong Kong Observatory website</a>.</p>`;
            html += `</div>`;
            
            modalBody.innerHTML = html;
        }

        async function openMetricModal(metricType) {
            const modal = document.getElementById('metricModal');
            const modalBody = document.getElementById('metric-modal-body');
            
            modal.style.display = 'flex';
            modalBody.innerHTML = '<div class="loading-spinner">Loading...</div>';
            
            try {
                const content = await loadMetricDetails(metricType);
                modalBody.innerHTML = content;
            } catch (err) {
                console.error('Metric modal error:', err);
                modalBody.innerHTML = '<div class="error-message">Unable to load metric details.</div>';
            }
        }

        function openAQHIModal() {
            const modal = document.getElementById('metricModal');
            const modalBody = document.getElementById('metric-modal-body');
            modal.style.display = 'flex';
            modalBody.innerHTML = generateAQHIInfo();
        }

        function generateAQHIInfo() {
            return `
                <h2 style="color:#667eea; margin-bottom:16px;">🌫️ Air Quality Health Index</h2>
                <div class="metric-description">
                    <p>The Air Quality Health Index (AQHI) is Hong Kong's air quality reporting system. It consolidates data from multiple pollutants (NO₂, O₃, SO₂, PM₁₀, PM₂.₅) into a single index representing short-term health risks.</p>
                </div>

                <details open style="margin:20px 0; cursor:pointer;">
                    <summary style="font-weight:600; color:#667eea; font-size:15px; padding:12px; background:#f3f4f6; border-radius:8px; user-select:none;">
                        📊 AQHI Grading Scale & Health Advisories
                    </summary>
                    <div style="margin-top:16px; padding:12px;">
                        <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; background:#00e676; color:white; font-size:12px; font-weight:600;">1-3 Low</span>
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; background:#ffea00; color:#111827; font-size:12px; font-weight:600;">4-6 Moderate</span>
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; background:#ff6d00; color:white; font-size:12px; font-weight:600;">7 High</span>
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; background:#ff1744; color:white; font-size:12px; font-weight:600;">8-10 Very High</span>
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; background:#d500f9; color:white; font-size:12px; font-weight:600;">10+ Serious</span>
                        </div>

                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <thead>
                                <tr style="background:#f9fafb; font-weight:600; color:#374151;">
                                    <th style="padding:10px; text-align:left; border-bottom:2px solid #e5e7eb;">Level</th>
                                    <th style="padding:10px; text-align:center; border-bottom:2px solid #e5e7eb;">Range</th>
                                    <th style="padding:10px; text-align:left; border-bottom:2px solid #e5e7eb;">Health Advisory</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:#00e676; margin-right:6px;"></span>Low</td>
                                    <td style="padding:10px; text-align:center; border-bottom:1px solid #e5e7eb;">1–3</td>
                                    <td style="padding:10px; color:#4b5563; border-bottom:1px solid #e5e7eb;">No health risk. Normal activities can continue.</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:#ffea00; margin-right:6px;"></span>Moderate</td>
                                    <td style="padding:10px; text-align:center; border-bottom:1px solid #e5e7eb;">4–6</td>
                                    <td style="padding:10px; color:#4b5563; border-bottom:1px solid #e5e7eb;">Sensitive groups (children, elderly, heart/lung conditions) consider reducing prolonged outdoor exertion.</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:#ff6d00; margin-right:6px;"></span>High</td>
                                    <td style="padding:10px; text-align:center; border-bottom:1px solid #e5e7eb;">7</td>
                                    <td style="padding:10px; color:#4b5563; border-bottom:1px solid #e5e7eb;">Sensitive groups reduce outdoor exertion. General public limit prolonged strenuous activities.</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px; border-bottom:1px solid #e5e7eb;"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:#ff1744; margin-right:6px;"></span>Very High</td>
                                    <td style="padding:10px; text-align:center; border-bottom:1px solid #e5e7eb;">8–10</td>
                                    <td style="padding:10px; color:#4b5563; border-bottom:1px solid #e5e7eb;">Sensitive groups avoid outdoor exertion. General public reduce outdoor activities.</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px;"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:#d500f9; margin-right:6px;"></span>Serious</td>
                                    <td style="padding:10px; text-align:center;">10+</td>
                                    <td style="padding:10px; color:#4b5563;">Everyone minimize outdoor exertion. Move activities indoors or reschedule.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </details>

                <div style="margin-top:20px; padding:16px; background:#f0f9ff; border-left:4px solid #0ea5e9; border-radius:6px;">
                    <p style="margin:0; font-size:13px; color:#0c4a6e;">
                        <strong>💡 Note:</strong> The AQHI shown in the dashboard header represents the Hong Kong-wide average across all monitoring stations. Individual station values may vary.
                    </p>
                </div>

                <div style="margin-top:16px; font-size:12px; color:#6b7280;">
                    <p style="margin:0;">📚 Data source: <a href="https://www.aqhi.gov.hk" target="_blank" style="color:#667eea;">Hong Kong Environmental Protection Department (EPD)</a></p>
                </div>
            `;
        }

        async function loadMetricDetails(metricType) {
            const metricInfo = {
                temperature: {
                    title: '<img class="warning-icon" src="assets/temp.png"> Temperature',
                    description: 'Air temperature measured in degrees Celsius. Temperature affects comfort levels and energy consumption. Hong Kong experiences subtropical climate with hot summers and mild winters.',
                    hasForecast: true,
                    chartType: 'temperature'
                },
                humidity: {
                    title: '<img class="warning-icon" src="assets/hum.png"> Humidity',
                    description: 'Relative humidity indicates the amount of moisture in the air. High humidity can make hot weather feel more uncomfortable. Hong Kong typically has high humidity year-round.',
                    hasForecast: true,
                    chartType: 'humidity'
                },
                uv: {
                    title: '<img class="warning-icon" src="assets/uv.png"> UV Index',
                    description: 'UV Index measures ultraviolet radiation intensity. Higher values indicate greater risk of skin damage. Levels: 0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme.',
                    hasForecast: false
                },
                rain: {
                    title: '<img class="warning-icon" src="assets/rain.png"> Rainfall',
                    description: 'Precipitation measured in millimeters. Shows recent rainfall accumulation. Hong Kong receives most rainfall during the monsoon season (May-September).',
                    hasForecast: true,
                    chartType: 'rain'
                },
                wind: {
                    title: '<img class="warning-icon" src="assets/wind.png"> Wind',
                    description: 'Wind speed and direction. Measured in kilometers per hour. Important for outdoor activities and air quality dispersion. Strong winds can indicate approaching weather systems.',
                    hasForecast: false
                },
                visibility: {
                    title: '<img class="warning-icon" src="assets/visibility.png"> Visibility',
                    description: 'Horizontal visibility distance in kilometers. Reduced visibility can be caused by fog, haze, or air pollution. Important for aviation and maritime activities.',
                    hasForecast: false
                },
                no2: {
                    title: 'Nitrogen Dioxide (NO₂)',
                    description: 'A reddish-brown gas primarily from vehicle emissions and power plants. Can irritate airways and worsen respiratory conditions. Measured in µg/m³.',
                    hasForecast: false
                },
                o3: {
                    title: 'Ozone (O₃)',
                    description: 'Ground-level ozone forms when pollutants react with sunlight. Can cause breathing difficulties and reduce lung function. Typically higher on hot, sunny days.',
                    hasForecast: false
                },
                so2: {
                    title: 'Sulfur Dioxide (SO₂)',
                    description: 'Produced by burning fossil fuels and industrial processes. Can cause respiratory problems and acid rain. Measured in µg/m³.',
                    hasForecast: false
                },
                co: {
                    title: 'Carbon Monoxide (CO)',
                    description: 'Colorless, odorless gas from incomplete combustion. Mainly from vehicle exhaust. Reduces oxygen delivery to body tissues.',
                    hasForecast: false
                },
                pm10: {
                    title: 'PM₁₀ Particulate Matter',
                    description: 'Particles with diameter ≤10 micrometers. Can be inhaled into lungs causing respiratory issues. Sources include dust, pollen, and combustion.',
                    hasForecast: false
                },
                pm25: {
                    title: 'PM₂.₅ Particulate Matter',
                    description: 'Fine particles ≤2.5 micrometers. Can penetrate deep into lungs and bloodstream. Major health concern from vehicle emissions and industrial sources.',
                    hasForecast: false
                }
            };

            const info = metricInfo[metricType];
            if (!info) return '<p>Metric information not available.</p>';

            let html = `<h2>${info.title}</h2>`;
            html += `<div class="metric-description"><p>${info.description}</p></div>`;

            // Inject pollutant grading ranges (only for the selected pollutant)
            const pollutantTypes = ['no2','o3','so2','co','pm10','pm25'];
            if (pollutantTypes.includes(metricType)) {
                const pollutantMeta = {
                    no2: { label: 'NO₂', checks: [50, 100, 150, 200, 300, 9999], unit: 'µg/m³', name: 'Nitrogen Dioxide' },
                    o3:  { label: 'O₃',  checks: [80, 120, 160, 200, 250, 9999], unit: 'µg/m³', name: 'Ozone' },
                    so2: { label: 'SO₂', checks: [100, 200, 350, 500, 750, 9999], unit: 'µg/m³', name: 'Sulfur Dioxide' },
                    co:  { label: 'CO',  checks: [5000, 10000, 15000, 20000, 30000, 999999999999], unit: 'µg/m³', name: 'Carbon Monoxide' },
                    pm10:{ label: 'PM₁₀',checks: [30, 60, 100, 150, 200, 9999], unit: 'µg/m³', name: 'PM₁₀ Particulate' },
                    pm25:{ label: 'PM₂.₅',checks: [15, 30, 50, 75, 100, 9999], unit: 'µg/m³', name: 'PM₂.₅ Particulate' }
                };

                const advisoryByGrade = {
                    1: { title: 'Good', text: 'Air quality poses little or no risk.' },
                    2: { title: 'Fair', text: 'Acceptable; very sensitive people watch symptoms.' },
                    3: { title: 'Moderate', text: 'Sensitive groups limit prolonged outdoor exertion.' },
                    4: { title: 'Unhealthy (SG)', text: 'Sensitive groups reduce/avoid prolonged outdoor exertion.' },
                    5: { title: 'Unhealthy', text: 'Everyone reduce heavy/prolonged exertion; sensitive groups avoid.' },
                    6: { title: 'Very Unhealthy', text: 'Avoid outdoor exertion; move activities indoors.' }
                };

                const meta = pollutantMeta[metricType];
                const colours = ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"];

                function format(n){ return n.toLocaleString('en-US'); }
                function buildRanges(checks){
                    const ranges = [];
                    for (let i=0;i<checks.length;i++){
                        const upper = checks[i];
                        if (i === 0) {
                            ranges.push({ grade: 1, range: `≤${format(upper)}` });
                        } else if (i === checks.length - 1) {
                            const prev = checks[i-1] + 1;
                            ranges.push({ grade: i+1, range: `≥${format(prev)}` });
                        } else {
                            const prev = checks[i-1] + 1;
                            ranges.push({ grade: i+1, range: `${format(prev)}–${format(upper)}` });
                        }
                    }
                    return ranges;
                }
                const ranges = buildRanges(meta.checks);

                html += `<div class="modal-section">
                    <h3>${meta.label} Grading</h3>
                    <details open style="margin-top:4px;">
                        <summary style="cursor:pointer; font-size:12px; font-weight:600; color:#374151;">Show grading & advisory</summary>
                        <div style="margin-top:8px;">
                            <p style="font-size:11px; color:#6b7280; line-height:1.3; margin-bottom:6px;">Grade 1 = lowest concentration (best). Units: ${meta.unit}. Simplified visual scale; not an official health index.</p>
                            <div style="display:flex; gap:6px; flex-wrap:wrap; margin:4px 0 10px;">
                                ${ranges.map(r => {
                                    const col = colours[r.grade-1];
                                    const useLight = ['#d50000','#aa00ff','#ff3d00'].includes(col);
                                    const fg = useLight ? '#ffffff' : '#000000';
                                    return `<span style=\"background:${col};color:${fg};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;min-width:26px;text-align:center;\">${r.grade}</span>`;
                                }).join('')}
                            </div>
                            <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
                                <thead>
                                    <tr style="background:#f3f4f6;">
                                        <th style="text-align:left; padding:5px 6px; border:1px solid #e5e7eb;">Grade</th>
                                        <th style="text-align:left; padding:5px 6px; border:1px solid #e5e7eb;">${meta.label} Range</th>
                                        <th style="text-align:left; padding:5px 6px; border:1px solid #e5e7eb;">Advisory</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${ranges.map(r => `<tr ${r.grade%2===0? 'style=\"background:#fafafa;\"':''}>
                                        <td style=\"padding:5px 6px; border:1px solid #e5e7eb; font-weight:600;\">${r.grade}</td>
                                        <td style=\"padding:5px 6px; border:1px solid #e5e7eb;\">${r.range}</td>
                                        <td style=\"padding:5px 6px; border:1px solid #e5e7eb;\"><span style=\"font-weight:600;\">${advisoryByGrade[r.grade].title}:</span> ${advisoryByGrade[r.grade].text}</td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                            <p style="font-size:10px; color:#9ca3af;">Guide only – consult official sources for health advisories.</p>
                        </div>
                    </details>
                </div>`;
            }

            if (info.hasForecast) {
                try {
                    const forecastData = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en');
                    const forecast = await forecastData.json();
                    
                    if (info.chartType === 'temperature') {
                        html += generateTemperatureChart(forecast.weatherForecast);
                    } else if (info.chartType === 'rain') {
                        html += generateRainChart(forecast.weatherForecast);
                    } else if (info.chartType === 'humidity') {
                        html += generateHumidityChart(forecast.weatherForecast);
                    }
                } catch (err) {
                    console.error('Forecast fetch failed:', err);
                    html += '<p style="color:#9ca3af; font-size:13px;">Forecast data unavailable</p>';
                }
            }

            return html;
        }

        function generateTemperatureChart(forecastData) {
            const days = forecastData.slice(0, 7);
            
            // Find actual min and max temperatures in the forecast
            const allMaxTemps = days.map(d => d.forecastMaxtemp?.value || 0);
            const allMinTemps = days.map(d => d.forecastMintemp?.value || 0);
            const actualMax = Math.max(...allMaxTemps);
            const actualMin = Math.min(...allMinTemps);
            
            // Add buffer (20% of range) for better visualization
            const tempRange = actualMax - actualMin;
            const buffer = Math.max(tempRange * 0.2, 3); // Minimum 3° buffer
            const scaleMin = actualMin - buffer;
            const scaleMax = actualMax + buffer;
            const scaleRange = scaleMax - scaleMin;
            
            let html = '<div class="forecast-chart"><h3 style="margin-bottom:16px; color:#374151;">7-Day Temperature Forecast</h3>';
            html += '<div style="position:relative; height:250px; padding:10px 10px 70px 45px;">';
            
            const chartHeight = 170;
            
            // Draw grid lines for reference
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; border-bottom:2px solid #d1d5db;">`;
            for (let i = 0; i <= 4; i++) {
                const temp = scaleMin + (scaleRange * i / 4);
                const positionPx = (i / 4) * chartHeight;
                html += `<div style="position:absolute; bottom:${positionPx}px; left:0; right:0; border-top:1px solid #e5e7eb; height:0;">
                    <span style="position:absolute; left:-40px; top:-8px; font-size:10px; color:#9ca3af; width:35px; text-align:right;">${Math.round(temp)}°</span>
                </div>`;
            }
            html += '</div>';
            
            // Draw bars container
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; display:flex; justify-content:space-around; gap:4px;">`;
            
            days.forEach(day => {
                const max = day.forecastMaxtemp?.value || 0;
                const min = day.forecastMintemp?.value || 0;
                const dayLabel = day.week.substring(0, 3);
                const iconCode = day.ForecastIcon || 50;
                
                // Calculate positions in pixels for precision
                const maxHeightPx = ((max - scaleMin) / scaleRange) * chartHeight;
                const minHeightPx = ((min - scaleMin) / scaleRange) * chartHeight;
                const barHeightPx = maxHeightPx - minHeightPx;
                
                html += `
                    <div style="flex:1; position:relative; height:${chartHeight}px;">
                        <div style="position:absolute; bottom:${minHeightPx}px; left:10%; right:10%; height:${barHeightPx}px; background:linear-gradient(180deg, #667eea 0%, #764ba2 100%); border-radius:6px; min-height:4px;">
                            <div style="position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:700; color:#667eea; white-space:nowrap;">${max}°</div>
                            <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); font-size:10px; color:#9ca3af; white-space:nowrap;">${min}°</div>
                        </div>
                        <div style="position:absolute; bottom:-54px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <img src="assets/hko/pic${iconCode}.png" alt="Weather" style="width:24px; height:24px; object-fit:contain;" />
                            <div style="font-size:11px; font-weight:600; color:#374151; white-space:nowrap;">${dayLabel}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
            html += `<p style="font-size:11px; color:#9ca3af; margin-top:8px; text-align:center;">Temperature range: ${Math.round(scaleMin)}° - ${Math.round(scaleMax)}°C</p>`;
            html += '</div>';
            return html;
        }

        function generateHumidityChart(forecastData) {
            const days = forecastData.slice(0, 7);
            
            // Find actual min and max humidity in the forecast
            const allMaxRH = days.map(d => d.forecastMaxrh?.value || 0);
            const allMinRH = days.map(d => d.forecastMinrh?.value || 0);
            const actualMax = Math.max(...allMaxRH);
            const actualMin = Math.min(...allMinRH);
            
            // Add buffer (20% of range) for better visualization
            const rhRange = actualMax - actualMin;
            const buffer = Math.max(rhRange * 0.2, 5); // Minimum 5% buffer
            const scaleMin = Math.max(0, actualMin - buffer);
            const scaleMax = Math.min(100, actualMax + buffer);
            const scaleRange = scaleMax - scaleMin;
            
            let html = '<div class="forecast-chart"><h3 style="margin-bottom:16px; color:#374151;">7-Day Humidity Forecast</h3>';
            html += '<div style="position:relative; height:250px; padding:10px 10px 70px 45px;">';
            
            const chartHeight = 170;
            
            // Draw grid lines for reference
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; border-bottom:2px solid #d1d5db;">`;
            for (let i = 0; i <= 4; i++) {
                const rh = scaleMin + (scaleRange * i / 4);
                const positionPx = (i / 4) * chartHeight;
                html += `<div style="position:absolute; bottom:${positionPx}px; left:0; right:0; border-top:1px solid #e5e7eb; height:0;">
                    <span style="position:absolute; left:-40px; top:-8px; font-size:10px; color:#9ca3af; width:35px; text-align:right;">${Math.round(rh)}%</span>
                </div>`;
            }
            html += '</div>';
            
            // Draw bars container
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; display:flex; justify-content:space-around; gap:4px;">`;
            
            days.forEach(day => {
                const max = day.forecastMaxrh?.value || 0;
                const min = day.forecastMinrh?.value || 0;
                const dayLabel = day.week.substring(0, 3);
                const iconCode = day.ForecastIcon || 50;
                
                // Calculate positions in pixels for precision
                const maxHeightPx = ((max - scaleMin) / scaleRange) * chartHeight;
                const minHeightPx = ((min - scaleMin) / scaleRange) * chartHeight;
                const barHeightPx = maxHeightPx - minHeightPx;
                
                html += `
                    <div style="flex:1; position:relative; height:${chartHeight}px;">
                        <div style="position:absolute; bottom:${minHeightPx}px; left:10%; right:10%; height:${barHeightPx}px; background:linear-gradient(180deg, #3b82f6 0%, #1e40af 100%); border-radius:6px; min-height:4px;">
                            <div style="position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:700; color:#3b82f6; white-space:nowrap;">${max}%</div>
                            <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); font-size:10px; color:#9ca3af; white-space:nowrap;">${min}%</div>
                        </div>
                        <div style="position:absolute; bottom:-54px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <img src="assets/hko/pic${iconCode}.png" alt="Weather" style="width:24px; height:24px; object-fit:contain;" />
                            <div style="font-size:11px; font-weight:600; color:#374151; white-space:nowrap;">${dayLabel}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
            html += `<p style="font-size:11px; color:#9ca3af; margin-top:8px; text-align:center;">Humidity range: ${Math.round(scaleMin)}% - ${Math.round(scaleMax)}%</p>`;
            html += '</div>';
            return html;
        }

        function generateRainChart(forecastData) {
            const days = forecastData.slice(0, 7);
            
            // Map PSR levels to numeric values for dynamic scaling
            const psrToValue = {
                'Low': 10,
                'Medium Low': 25,
                'Medium': 50,
                'Medium High': 75,
                'High': 95
            };
            
            const psrToColor = {
                'Low': '#10b981',
                'Medium Low': '#3b82f6',
                'Medium': '#f59e0b',
                'Medium High': '#ef4444',
                'High': '#7c3aed'
            };
            
            const psrToRange = {
                'Low': '0-5mm',
                'Medium Low': '5-15mm',
                'Medium': '15-30mm',
                'Medium High': '30-50mm',
                'High': '50mm+'
            };
            
            // Find min and max PSR values in forecast
            const psrValues = days.map(d => psrToValue[d.PSR || 'Low']);
            const minValue = Math.min(...psrValues);
            const maxValue = Math.max(...psrValues);
            
            // Add buffer for better visualization
            const range = maxValue - minValue;
            const buffer = Math.max(range * 0.15, 10); // At least 10% buffer
            const scaleMin = Math.max(0, minValue - buffer);
            const scaleMax = Math.min(100, maxValue + buffer);
            const scaleRange = scaleMax - scaleMin;
            
            let html = '<div class="forecast-chart"><h3 style="margin-bottom:16px; color:#374151;">7-Day Rain Probability & Expected Range</h3>';
            html += '<div style="position:relative; height:250px; padding:10px 10px 70px 45px;">';
            
            const chartHeight = 170;
            
            // Draw grid lines
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; border-bottom:2px solid #d1d5db;">`;
            for (let i = 0; i <= 4; i++) {
                const value = scaleMin + (scaleRange * i / 4);
                const positionPx = (i / 4) * chartHeight;
                html += `<div style="position:absolute; bottom:${positionPx}px; left:0; right:0; border-top:1px solid #e5e7eb; height:0;">
                    <span style="position:absolute; left:-40px; top:-8px; font-size:10px; color:#9ca3af; width:35px; text-align:right;">${Math.round(value)}%</span>
                </div>`;
            }
            html += '</div>';
            
            // Draw bars container
            html += `<div style="position:absolute; bottom:70px; left:45px; right:10px; height:${chartHeight}px; display:flex; justify-content:space-around; gap:4px;">`;
            
            days.forEach(day => {
                const psr = day.PSR || 'Low';
                const dayLabel = day.week.substring(0, 3);
                const value = psrToValue[psr];
                const color = psrToColor[psr];
                const rainRange = psrToRange[psr];
                const iconCode = day.ForecastIcon || 50;
                
                // Calculate bar height in pixels with proper scaling
                const barHeightPx = ((value - scaleMin) / scaleRange) * chartHeight;
                
                html += `
                    <div style="flex:1; position:relative; height:${chartHeight}px;">
                        <div style="position:absolute; bottom:0; left:10%; right:10%; height:${barHeightPx}px; background:linear-gradient(180deg, ${color} 0%, ${color}aa 100%); border-radius:6px 6px 0 0; min-height:4px;">
                            <div style="position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:700; color:${color}; white-space:nowrap;">${psr}</div>
                        </div>
                        <div style="position:absolute; bottom:-54px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <img src="assets/hko/pic${iconCode}.png" alt="Weather" style="width:24px; height:24px; object-fit:contain;" />
                            <div style="font-size:11px; font-weight:600; color:#374151; white-space:nowrap;">${dayLabel}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
            
            // Add reference table for PSR levels
            html += `
                <div style="margin-top:16px; padding:12px; background:#f9fafb; border-radius:8px;">
                    <h4 style="margin:0 0 8px 0; font-size:12px; color:#374151; font-weight:600;">Rain Probability Categories</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:11px;">
                        <thead>
                            <tr style="border-bottom:1px solid #e5e7eb;">
                                <th style="text-align:left; padding:6px; color:#6b7280;">Category</th>
                                <th style="text-align:right; padding:6px; color:#6b7280;">Est. Rainfall</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom:1px solid #f3f4f6;">
                                <td style="padding:6px; color:#10b981; font-weight:600;">Low</td>
                                <td style="padding:6px; text-align:right; color:#4b5563;">0-5mm</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f3f4f6;">
                                <td style="padding:6px; color:#3b82f6; font-weight:600;">Medium Low</td>
                                <td style="padding:6px; text-align:right; color:#4b5563;">5-15mm</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f3f4f6;">
                                <td style="padding:6px; color:#f59e0b; font-weight:600;">Medium</td>
                                <td style="padding:6px; text-align:right; color:#4b5563;">15-30mm</td>
                            </tr>
                            <tr style="border-bottom:1px solid #f3f4f6;">
                                <td style="padding:6px; color:#ef4444; font-weight:600;">Medium High</td>
                                <td style="padding:6px; text-align:right; color:#4b5563;">30-50mm</td>
                            </tr>
                            <tr>
                                <td style="padding:6px; color:#7c3aed; font-weight:600;">High</td>
                                <td style="padding:6px; text-align:right; color:#4b5563;">50mm+</td>
                            </tr>
                        </tbody>
                    </table>
                    <p style="margin:8px 0 0 0; font-size:10px; color:#9ca3af; font-style:italic;">* Rainfall estimates are approximate</p>
                </div>
            `;
            
            html += '</div>';
            return html;
        }

        function toggleTrafficDetail(itemId) {
            const fullDiv = document.getElementById(itemId + '-full');
            const btn = document.getElementById(itemId + '-btn');
            
            if (fullDiv.style.display === 'none') {
                fullDiv.style.display = 'block';
                btn.textContent = 'Show less';
            } else {
                fullDiv.style.display = 'none';
                btn.textContent = 'Show more';
            }
        }

        async function loadEventsData() {
            try {
                const res = await fetch('https://purple-river-7d7a.trials-9f5.workers.dev/?feed=holidays');
                const data = await res.json();
                
                const events = data?.vcalendar?.[0]?.vevent || [];
                if (events.length === 0) {
                    return '<h2>📅 Public Holidays</h2><div class="modal-section"><p>No holiday data available.</p></div>';
                }
                
                // Parse and sort holidays
                const now = new Date();
                const holidays = events.map(evt => {
                    const dateStr = Array.isArray(evt.dtstart) ? evt.dtstart[0] : evt.dtstart;
                    const year = parseInt(dateStr.substring(0, 4));
                    const month = parseInt(dateStr.substring(4, 6)) - 1;
                    const day = parseInt(dateStr.substring(6, 8));
                    const date = new Date(year, month, day);
                    
                    return {
                        date: date,
                        dateStr: dateStr,
                        summary: evt.summary || 'Holiday',
                        isPast: date < now
                    };
                }).sort((a, b) => a.date - b.date);
                
                // Split into upcoming and past
                const upcoming = holidays.filter(h => !h.isPast).slice(0, 10);
                const recent = holidays.filter(h => h.isPast).slice(-5).reverse();
                
                let html = '<h2>📅 Hong Kong Public Holidays</h2><div class="modal-section">';
                
                if (upcoming.length > 0) {
                    html += '<h3 style="margin-top:0; color:#667eea;">Upcoming Holidays</h3>';
                    upcoming.forEach(h => {
                        const dayName = h.date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateFormatted = h.date.toLocaleDateString('en-HK', { year: 'numeric', month: 'short', day: 'numeric' });
                        const daysUntil = Math.ceil((h.date - now) / (1000 * 60 * 60 * 24));
                        
                        html += `
                            <div class="news-item" style="border-left-color: #22c55e;">
                                <h4 style="color:#1f2937; margin:0 0 4px 0;">${h.summary}</h4>
                                <p style="margin:4px 0; color:#6b7280; font-size:13px;">${dayName}, ${dateFormatted}</p>
                                <p style="margin:4px 0; color:#22c55e; font-size:12px; font-weight:600;">${daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}</p>
                            </div>
                        `;
                    });
                }
                
                if (recent.length > 0) {
                    html += '<h3 style="margin-top:16px; color:#9ca3af;">Recent Holidays</h3>';
                    recent.forEach(h => {
                        const dayName = h.date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateFormatted = h.date.toLocaleDateString('en-HK', { year: 'numeric', month: 'short', day: 'numeric' });
                        
                        html += `
                            <div class="news-item" style="border-left-color: #d1d5db; opacity: 0.7;">
                                <h4 style="color:#6b7280; margin:0 0 4px 0;">${h.summary}</h4>
                                <p style="margin:4px 0; color:#9ca3af; font-size:13px;">${dayName}, ${dateFormatted}</p>
                            </div>
                        `;
                    });
                }
                
                html += '</div>';
                return html;
            } catch (err) {
                console.error('Events fetch failed:', err);
                return '<h2>📅 Public Holidays</h2><div class="error-message">Unable to load holiday data.</div>';
            }
        }

        async function checkTodayHoliday() {
            try {
                const res = await fetch('https://purple-river-7d7a.trials-9f5.workers.dev/?feed=holidays');
                const data = await res.json();
                
                const events = data?.vcalendar?.[0]?.vevent || [];
                if (events.length === 0) return;
                
                const today = new Date();
                const todayStr = today.getFullYear() + 
                                String(today.getMonth() + 1).padStart(2, '0') + 
                                String(today.getDate()).padStart(2, '0');
                
                const todayHoliday = events.find(evt => {
                    const dateStr = Array.isArray(evt.dtstart) ? evt.dtstart[0] : evt.dtstart;
                    return dateStr === todayStr;
                });
                
                if (todayHoliday) {
                    const banner = document.getElementById('holidayBanner');
                    banner.textContent = `🎉 ${todayHoliday.summary}`;
                    banner.style.display = 'block';
                }
            } catch (err) {
                console.error('Holiday check failed:', err);
            }
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('modal');
            const metricModal = document.getElementById('metricModal');
            
            if (event.target === modal) {
                closeModal();
            }
            if (event.target === metricModal) {
                closeMetricModal();
            }
        };

                // --- Live data wiring (self-contained; does not modify index.html or script.js) ---
                ;(function(){
                    const workerBase = "https://purple-river-7d7a.trials-9f5.workers.dev/?feed=";
                    const aqhiUrl = workerBase + "aqhi";
                    const pollutantUrl = workerBase + "pollutants";
                    const weatherUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en";
                    const warningsUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en";
                    const windCsvProxyUrl = workerBase + "windcsv";
                    const windCsvUrl = "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_10min_wind.csv";
                    const visCsvProxyUrl = workerBase + "visibility";
                    const visCsvUrl = "https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=LTMV&lang=en&rformat=csv";

                    const stationSelect = document.getElementById('stationSelector');
                    const tempValueEl = document.getElementById('tempValue');
                    const humidityValueEl = document.getElementById('humidityValue');
                    const uvValueEl = document.getElementById('uvValue');
                    const rainValueEl = document.getElementById('rainValue');
                    const windValueEl = document.getElementById('windValue');
                    const visibilityValueEl = document.getElementById('visibilityValue');

                    const no2ValueEl = document.getElementById('no2Value');
                    const o3ValueEl = document.getElementById('o3Value');
                    const so2ValueEl = document.getElementById('so2Value');
                    const coValueEl = document.getElementById('coValue');
                    const pm10ValueEl = document.getElementById('pm10Value');
                    const pm25ValueEl = document.getElementById('pm25Value');
                    const warningsContainer = document.getElementById('warningsContainer');

                    // Robust fetch with retry logic for CORS reliability
                    async function fetchWithRetry(url, options = {}, retries = 3) {
                        for (let attempt = 0; attempt < retries; attempt++) {
                            try {
                                // Add cache-busting on retries to bypass edge cache issues
                                const fetchUrl = attempt > 0 
                                    ? url + (url.includes('?') ? '&' : '?') + `_retry=${attempt}&_ts=${Date.now()}`
                                    : url;
                                
                                const response = await fetch(fetchUrl, {
                                    ...options,
                                    headers: {
                                        ...options.headers,
                                        // Ensure Origin header is sent for CORS
                                        'Accept': options.headers?.Accept || 'application/json'
                                    }
                                });
                                
                                if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                }
                                
                                // Log successful fetch with retry info if applicable
                                if (attempt > 0) {
                                    console.log(`[RETRY SUCCESS] ${url} succeeded on attempt ${attempt + 1}`);
                                }
                                
                                return response;
                                
                            } catch (error) {
                                const isLastAttempt = attempt === retries - 1;
                                
                                // Log the error
                                console.warn(`[FETCH ATTEMPT ${attempt + 1}/${retries}] ${url} failed:`, error.message);
                                
                                // If this is the last attempt, throw the error
                                if (isLastAttempt) {
                                    console.error(`[FETCH FAILED] ${url} failed after ${retries} attempts`);
                                    throw error;
                                }
                                
                                // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms...)
                                const delay = 500 * Math.pow(2, attempt);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }

                    const stationWeatherMap = {
                        // Only 4 visibility stations: Central, Chek Lap Kok, Sai Wan Ho, Waglan Island
                        // Mapping generously based on geographic proximity
                        "Central/Western": { tempPlace: "Hong Kong Observatory", rainPlace: "Central & Western District", windPlace: "Central Pier", visPlace: "Central" },
                        "Central": { tempPlace: "Hong Kong Observatory", rainPlace: "Central & Western District", windPlace: "Central Pier", visPlace: "Central" },
                        "Eastern": { tempPlace: "King's Park", rainPlace: "Eastern District", windPlace: "North Point", visPlace: "Sai Wan Ho" },
                        "Islands": { tempPlace: "Chek Lap Kok", rainPlace: "Islands District", windPlace: "Chek Lap Kok", visPlace: "Chek Lap Kok" },
                        "North": { tempPlace: "Ta Kwu Ling", rainPlace: "North District", windPlace: "Ta Kwu Ling", visPlace: "Sai Wan Ho" },
                        "Sai Kung": { tempPlace: "Sai Kung", rainPlace: "Sai Kung", windPlace: "Sai Kung", visPlace: "Sai Wan Ho" },
                        "Sha Tin": { tempPlace: "Sha Tin", rainPlace: "Sha Tin", windPlace: "Sha Tin", visPlace: "Sai Wan Ho" },
                        "Southern": { tempPlace: "Wong Chuk Hang", rainPlace: "Southern District", windPlace: "Wong Chuk Hang", visPlace: "Central" },
                        "Tai Po": { tempPlace: "Tai Po", rainPlace: "Tai Po", windPlace: "Tai Po Kau", visPlace: "Sai Wan Ho" },
                        "Tsuen Wan": { tempPlace: "Tsuen Wan Shing Mun Valley", rainPlace: "Tsuen Wan", windPlace: "Tsing Yi", visPlace: "Central" },
                        "Tuen Mun": { tempPlace: "Tuen Mun", rainPlace: "Tuen Mun", windPlace: "Tuen Mun", visPlace: "Chek Lap Kok" },
                        "Wan Chai": { tempPlace: "Happy Valley", rainPlace: "Wan Chai", windPlace: "Star Ferry", visPlace: "Central" },
                        "Yuen Long": { tempPlace: "Yuen Long Park", rainPlace: "Yuen Long", windPlace: "Wetland Park", visPlace: "Chek Lap Kok" },
                        "Yau Tsim Mong": { tempPlace: "King's Park", rainPlace: "Yau Tsim Mong", windPlace: "King's Park", visPlace: "Central" },
                        "Kowloon City": { tempPlace: "Kowloon City", rainPlace: "Kowloon City", windPlace: "Kai Tak", visPlace: "Sai Wan Ho" },
                        "Sham Shui Po": { tempPlace: "Sham Shui Po", rainPlace: "Sham Shui Po", windPlace: "King's Park", visPlace: "Central" },
                        "Wong Tai Sin": { tempPlace: "Wong Tai Sin", rainPlace: "Wong Tai Sin", windPlace: "Tate's Cairn", visPlace: "Sai Wan Ho" },
                        "Kwun Tong": { tempPlace: "Kwun Tong", rainPlace: "Kwun Tong", windPlace: "Kai Tak", visPlace: "Sai Wan Ho" },
                        // Additional AQHI stations
                        "Kwai Chung": { tempPlace: "Tsing Yi", rainPlace: "Kwai Tsing", windPlace: "Tsing Yi", visPlace: "Central" },
                        "Tseung Kwan O": { tempPlace: "Tseung Kwan O", rainPlace: "Sai Kung", windPlace: "Tseung Kwan O", visPlace: "Sai Wan Ho" },
                        "Tung Chung": { tempPlace: "Chek Lap Kok", rainPlace: "Islands District", windPlace: "Chek Lap Kok", visPlace: "Chek Lap Kok" },
                        "Tap Mun": { tempPlace: "Tap Mun", rainPlace: "North District", windPlace: "Tap Mun", visPlace: "Waglan Island" },
                        "Causeway Bay": { tempPlace: "Happy Valley", rainPlace: "Wan Chai", windPlace: "North Point", visPlace: "Sai Wan Ho" },
                        "Mong Kok": { tempPlace: "King's Park", rainPlace: "Yau Tsim Mong", windPlace: "King's Park", visPlace: "Central" }
                    };

                    function getQueryParam(param){
                        const urlParams = new URLSearchParams(window.location.search);
                        return urlParams.get(param);
                    }

                                async function loadStations(){
                        try{
                            const res = await fetchWithRetry(aqhiUrl);
                            const data = await res.json();
                            // Populate selector
                            stationSelect.innerHTML = '';
                            data.forEach(s => {
                                const opt = document.createElement('option');
                                opt.value = s.station;
                                opt.textContent = s.station;
                                stationSelect.appendChild(opt);
                            });


                            // Prefer last station from localStorage, then ?station param, then default
                            const fromParam = getQueryParam('station');
                            const lastStation = localStorage.getItem('hkdash_last_station');
                            if (lastStation && data.some(s => s.station === lastStation)) {
                                stationSelect.value = lastStation;
                            } else if (fromParam) {
                                const found = data.find(s => s.station.toLowerCase() === fromParam.toLowerCase());
                                if (found) stationSelect.value = found.station;
                            }
                            if (!stationSelect.value && data.length) stationSelect.value = data[0].station;

                            // Initial update
                            await updateForStation(stationSelect.value);
                            // announcements disabled
                            // On change, persist to localStorage
                            stationSelect.addEventListener('change', e => {
                                const val = e.target.value;
                                localStorage.setItem('hkdash_last_station', val);
                                // announcements disabled
                                updateForStation(val);
                            });
                        } catch(e){
                            console.error('Failed to load stations', e);
                                            // Fallback for local dev (CORS from Worker)
                                            const fallbackStations = [
                                                'Central/Western','Eastern','Kwai Chung','Sha Tin','Sham Shui Po','Tai Po','Tseung Kwan O','Tuen Mun','Tung Chung','Yuen Long','Causeway Bay','Mong Kok','Tap Mun','North','Kwun Tong','Tsuen Wan','Wong Tai Sin'
                                            ];
                                            stationSelect.innerHTML = '';
                                            fallbackStations.forEach(name => {
                                                const opt = document.createElement('option');
                                                opt.value = name;
                                                opt.textContent = name;
                                                stationSelect.appendChild(opt);
                                            });
                                            document.getElementById('sd-status').style.display = 'block';
                                            document.getElementById('sd-status').textContent = 'Note: Live AQHI/pollutants require the proxy when developing locally. Weather will still load. Open on GitHub Pages for full data.';
                                            await updateForStation(stationSelect.value || fallbackStations[0]);
                                            // announcements disabled
                                            stationSelect.addEventListener('change', e => {
                                                const val = e.target.value;
                                                // announcements disabled
                                                updateForStation(val);
                                            });
                        }
                    }

                    async function loadWarnings(){
                        try {
                            const res = await fetch(warningsUrl);
                            const data = await res.json();

                            const activeWarnings = Object.entries(data)
                                .filter(([key, warning]) => warning.actionCode === "ISSUE")
                                .map(([key, warning]) => ({
                                    code: key,
                                    ...warning
                                }));

                            if (activeWarnings.length === 0) {
                                warningsContainer.innerHTML = '';
                            } else {
                                warningsContainer.innerHTML = activeWarnings.map(warning => {
                                    const warningClass = getWarningClass(warning.code);
                                    const name = getWarningName(warning.code);
                                    const issueTime = new Date(warning.issueTime).toLocaleString("en-HK", { hour12: false });
                                    let extra = "";
                                    if (warning.code.startsWith("WTCSIGNAL") || warning.code.startsWith("WTYPHOON")) {
                                        if (warning.type) {
                                            extra = `Level: ${warning.type}`;
                                        } else if (warning.name && warning.name.match(/No\.\s*\d+/i)) {
                                            extra = warning.name;
                                        }
                                    }
                                    const warningData = JSON.stringify({name, issueTime, extra}).replace(/"/g, '&quot;');
                                    return `
                                        <img src="assets/${warning.code}.png" 
                                             alt="${name}" 
                                             class="warning-icon-small ${warningClass}" 
                                             onclick="openWarningModal(${warningData})"
                                             title="${name}"
                                             style="cursor: pointer; border-radius: 6px; transition: transform 0.2s;"
                                             onmouseover="this.style.transform='scale(1.1)'"
                                             onmouseout="this.style.transform='scale(1)'"
                                             onerror="this.style.display='none'" />
                                    `;
                                }).join("");
                            }

                            // Update forecast card visibility based on warning count
                            updateForecastVisibility(activeWarnings.length);
                        } catch (err) {
                            console.error("Warnings fetch failed:", err);
                            warningsContainer.innerHTML = '<div class="no-warnings">Unable to load weather warnings</div>';
                            updateForecastVisibility(0);
                        }
                    }

                    async function updateForStation(stationName){
                        await Promise.all([
                            loadWarnings(),
                            updateWeather(stationName),
                            updatePollutants(stationName)
                        ]);
                        // Update timestamp after all data fetches complete
                        setFooterLastUpdated(Date.now());
                        // Check for alerts after data is loaded
                        checkAndShowAlerts();
                    }

                    // Update the footer last updated timestamp
                    function setFooterLastUpdated(date) {
                        const el = document.getElementById('footerLastUpdated');
                        if (!el) return;
                        if (!date) {
                            el.textContent = 'Last updated: —';
                            return;
                        }
                        // Format as e.g. 2025-11-25 14:23:01
                        const d = new Date(date);
                        const pad = n => n.toString().padStart(2, '0');
                        el.textContent = `Last updated: ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                    }

                    // ==================== ALERT SYSTEM ====================
                    let activeAlerts = new Map(); // Track active alerts by ID to prevent duplicates
                    let dismissedAlerts = new Set(); // Track dismissed alerts in this session

                    function checkAndShowAlerts() {
                        const alerts = [];

                        // 1. Check weather warnings
                        const warningsContainer = document.getElementById('warningsContainer');
                        if (warningsContainer && warningsContainer.children.length > 0) {
                            const warningCount = warningsContainer.children.length;
                            const warningIcons = Array.from(warningsContainer.children).map(w => w.textContent).join(' ');
                            alerts.push({
                                id: 'weather-warning',
                                type: 'critical',
                                icon: '⚠️',
                                title: `${warningCount} Weather Warning${warningCount > 1 ? 's' : ''} Active`,
                                message: `${warningIcons} Click warnings header for details.`
                            });
                        }

                        // 2. Check AQHI (dangerous levels: 7+)
                        const aqhiValue = document.getElementById('aqhiValue')?.textContent;
                        if (aqhiValue) {
                            const aqhi = parseInt(aqhiValue);
                            if (aqhi >= 10) {
                                alerts.push({
                                    id: 'aqhi-serious',
                                    type: 'critical',
                                    icon: '🚨',
                                    title: 'Serious Air Quality',
                                    message: `AQHI is <span class="alert-value">${aqhi}</span>. Minimize outdoor activities. Everyone at risk.`
                                });
                            } else if (aqhi >= 8) {
                                alerts.push({
                                    id: 'aqhi-veryhigh',
                                    type: 'critical',
                                    icon: '🔴',
                                    title: 'Very High Air Pollution',
                                    message: `AQHI is <span class="alert-value">${aqhi}</span>. Sensitive groups avoid outdoor activities.`
                                });
                            } else if (aqhi >= 7) {
                                alerts.push({
                                    id: 'aqhi-high',
                                    type: 'warning',
                                    icon: '🟠',
                                    title: 'High Air Pollution',
                                    message: `AQHI is <span class="alert-value">${aqhi}</span>. Sensitive groups reduce outdoor exertion.`
                                });
                            }
                        }

                        // 3. Check UV Index (sunscreen advisory: 6+)
                        const uvValue = document.getElementById('uvValue')?.textContent;
                        if (uvValue && uvValue !== '—' && uvValue !== 'N/A') {
                            const uv = parseFloat(uvValue);
                            if (uv >= 11) {
                                alerts.push({
                                    id: 'uv-extreme',
                                    type: 'critical',
                                    icon: '☀️',
                                    title: 'Extreme UV - Take Precautions',
                                    message: `UV Index is <span class="alert-value">${uv}</span>. Unprotected skin burns in minutes. Apply SPF 50+ sunscreen, wear hat & sunglasses.`
                                });
                            } else if (uv >= 8) {
                                alerts.push({
                                    id: 'uv-veryhigh',
                                    type: 'warning',
                                    icon: '🌞',
                                    title: 'Very High UV - Sunscreen Required',
                                    message: `UV Index is <span class="alert-value">${uv}</span>. Apply SPF 30+ sunscreen every 2 hours. Seek shade 10AM-4PM.`
                                });
                            } else if (uv >= 6) {
                                alerts.push({
                                    id: 'uv-high',
                                    type: 'info',
                                    icon: '🕶️',
                                    title: 'High UV - Protection Advised',
                                    message: `UV Index is <span class="alert-value">${uv}</span>. Use SPF 15+ sunscreen. Wear protective clothing.`
                                });
                            }
                        }

                        // 4. Check temperature extremes
                        const tempValue = document.getElementById('tempValue')?.textContent;
                        if (tempValue && tempValue !== '—') {
                            const temp = parseFloat(tempValue.replace('°C', ''));
                            if (temp >= 35) {
                                alerts.push({
                                    id: 'temp-extreme-heat',
                                    type: 'critical',
                                    icon: '🔥',
                                    title: 'Extreme Heat Warning',
                                    message: `Temperature is <span class="alert-value">${temp}°C</span>. Heat stroke risk. Stay hydrated & avoid prolonged sun exposure.`
                                });
                            } else if (temp >= 33) {
                                alerts.push({
                                    id: 'temp-hot',
                                    type: 'warning',
                                    icon: '🌡️',
                                    title: 'Very Hot Weather',
                                    message: `Temperature is <span class="alert-value">${temp}°C</span>. Drink plenty of water. Limit outdoor activities.`
                                });
                            } else if (temp <= 5) {
                                alerts.push({
                                    id: 'temp-cold',
                                    type: 'warning',
                                    icon: '❄️',
                                    title: 'Very Cold Weather',
                                    message: `Temperature is <span class="alert-value">${temp}°C</span>. Dress warmly. Watch for hypothermia risk.`
                                });
                            }
                        }

                        // 5. Check humidity extremes
                        const humidityValue = document.getElementById('humidityValue')?.textContent;
                        if (humidityValue && humidityValue !== '—') {
                            const humidity = parseFloat(humidityValue.replace('%', ''));
                            if (humidity >= 95 && tempValue) {
                                const temp = parseFloat(tempValue.replace('°C', ''));
                                if (temp >= 28) {
                                    alerts.push({
                                        id: 'humidity-extreme',
                                        type: 'warning',
                                        icon: '💦',
                                        title: 'Extremely Humid Conditions',
                                        message: `Humidity at <span class="alert-value">${humidity}%</span> with ${temp}°C. Heat stress risk elevated.`
                                    });
                                }
                            }
                        }

                        // 6. Check rainfall
                        const rainValue = document.getElementById('rainValue')?.textContent;
                        if (rainValue && rainValue !== '—' && rainValue !== '0 mm') {
                            const rain = parseFloat(rainValue.replace(' mm', ''));
                            if (rain >= 50) {
                                alerts.push({
                                    id: 'rain-heavy',
                                    type: 'warning',
                                    icon: '🌧️',
                                    title: 'Heavy Rainfall Recorded',
                                    message: `<span class="alert-value">${rain}mm</span> rainfall recorded. Flooding risk. Avoid low-lying areas.`
                                });
                            } else if (rain >= 30) {
                                alerts.push({
                                    id: 'rain-moderate',
                                    type: 'info',
                                    icon: '☔',
                                    title: 'Significant Rainfall',
                                    message: `<span class="alert-value">${rain}mm</span> rainfall recorded. Expect wet conditions.`
                                });
                            }
                        }

                        // 7. Check visibility
                        const visibilityValue = document.getElementById('visibilityValue')?.textContent;
                        if (visibilityValue && visibilityValue !== '—' && visibilityValue !== 'N/A') {
                            const vis = parseFloat(visibilityValue.replace(' km', ''));
                            if (vis <= 1) {
                                alerts.push({
                                    id: 'visibility-poor',
                                    type: 'warning',
                                    icon: '🌫️',
                                    title: 'Very Poor Visibility',
                                    message: `Visibility only <span class="alert-value">${vis}km</span>. Drive carefully. Delays expected.`
                                });
                            } else if (vis <= 3) {
                                alerts.push({
                                    id: 'visibility-reduced',
                                    type: 'info',
                                    icon: '🌁',
                                    title: 'Reduced Visibility',
                                    message: `Visibility <span class="alert-value">${vis}km</span>. Exercise caution when driving.`
                                });
                            }
                        }

                        // 8. Check PM2.5 levels
                        const pm25Value = document.getElementById('pm25Value')?.textContent;
                        if (pm25Value && pm25Value !== '—') {
                            const pm25 = parseFloat(pm25Value);
                            if (pm25 >= 100) {
                                alerts.push({
                                    id: 'pm25-unhealthy',
                                    type: 'critical',
                                    icon: '😷',
                                    title: 'Unhealthy PM2.5 Levels',
                                    message: `PM2.5 at <span class="alert-value">${pm25} µg/m³</span>. Wear N95 mask outdoors. Keep windows closed.`
                                });
                            } else if (pm25 >= 75) {
                                alerts.push({
                                    id: 'pm25-sensitive',
                                    type: 'warning',
                                    icon: '🎭',
                                    title: 'Elevated PM2.5 Levels',
                                    message: `PM2.5 at <span class="alert-value">${pm25} µg/m³</span>. Sensitive groups consider masks.`
                                });
                            }
                        }

                        // Display alerts
                        alerts.forEach(alert => showAlert(alert));

                        // Remove alerts that are no longer active
                        activeAlerts.forEach((alertEl, alertId) => {
                            if (!alerts.some(a => a.id === alertId)) {
                                dismissAlert(alertId, false);
                            }
                        });
                    }

                    function showAlert(alert) {
                        // Don't show if dismissed in this session
                        if (dismissedAlerts.has(alert.id)) return;

                        // Don't show if already active
                        if (activeAlerts.has(alert.id)) return;

                        const container = document.getElementById('alertContainer');
                        if (!container) return;

                        const alertEl = document.createElement('div');
                        alertEl.className = `alert-card ${alert.type}`;
                        alertEl.id = `alert-${alert.id}`;
                        alertEl.innerHTML = `
                            <div class="alert-header">
                                <div class="alert-title">
                                    <span class="alert-icon">${alert.icon}</span>
                                    ${alert.title}
                                </div>
                                <button class="alert-close" onclick="dismissAlert('${alert.id}')" aria-label="Dismiss">&times;</button>
                            </div>
                            <div class="alert-message">${alert.message}</div>
                        `;

                        container.appendChild(alertEl);
                        activeAlerts.set(alert.id, alertEl);

                        // Auto-dismiss all alerts after 10 seconds
                        setTimeout(() => dismissAlert(alert.id), 10000);
                    }

                    function dismissAlert(alertId, addToDismissed = true) {
                        const alertEl = activeAlerts.get(alertId);
                        if (!alertEl) return;

                        alertEl.classList.add('dismissing');
                        setTimeout(() => {
                            alertEl.remove();
                            activeAlerts.delete(alertId);
                        }, 300);

                        if (addToDismissed) {
                            dismissedAlerts.add(alertId);
                        }
                    }

                    // Make dismissAlert globally accessible
                    window.dismissAlert = dismissAlert;

                    // ==================== END ALERT SYSTEM ====================

                    // Caches for CSVs to avoid frequent network calls
                    let windCsvCache = { ts: 0, rows: [] };
                    let visCsvCache = { ts: 0, rows: [] };

                    // Color helper from main dashboard
                    function setColour(value, checks, returns) {
                        if (checks.length !== returns.length) {
                            throw new Error("Checks and returns arrays must be the same length");
                        }
                        for (let i = 0; i < checks.length; i++) {
                            if (value <= checks[i]) {
                                return returns[i];
                            }
                        }
                        return returns[returns.length - 1];
                    }

                    // Warning metadata
                    const warningMetadata = {
                        "WFIREY": { name: "Yellow Fire Danger Warning", icon: "🔥" },
                        "WFIRER": { name: "Red Fire Danger Warning", icon: "🔥" },
                        "WFIRE": { name: "Fire Danger Warning", icon: "🔥" },
                        "WTYPHOON": { name: "Typhoon Warning", icon: "🌪️" },
                        "WRAINSTORMY": { name: "Yellow Rainstorm Warning", icon: "🌧️" },
                        "WRAINSTORMR": { name: "Red Rainstorm Warning", icon: "🌧️" },
                        "WRAINSTORMB": { name: "Black Rainstorm Warning", icon: "🌧️" },
                        "WRAINSTORM": { name: "Rainstorm Warning", icon: "🌧️" },
                        "WUVI": { name: "High UV Warning", icon: "☀️" },
                        "WSMOG": { name: "Smog Warning", icon: "💨" },
                        "WSIGW": { name: "Significant Wave Warning", icon: "🌊" },
                        "WTMW": { name: "Tsunami Warning", icon: "🌊" },
                        "WCOLDRULE": { name: "Cold Weather Warning", icon: "❄️" },
                        "WHOTULE": { name: "Hot Weather Warning", icon: "🌡️" },
                        "WAIRPOL": { name: "Air Pollution Warning", icon: "💨" },
                        "WLOWVIS": { name: "Low Visibility Warning", icon: "🌫️" },
                        "WWIND": { name: "Wind Warning", icon: "💨" },
                        "WMSGNL": { name: "Strong Monsoon Signal", icon: "💨" },
                        "WTCSIGNAL": { name: "Tropical Cyclone Warning Signal", icon: "🌀" },
                        "WTHUNDER": { name: "Thunderstorm Warning", icon: "⚡" },
                        "WTS": { name: "Thunderstorm Warning", icon: "⚡" }
                    };

                    function getWarningIcon(type) {
                        return warningMetadata[type]?.icon || "⚠️";
                    }

                    function getWarningName(type) {
                        return warningMetadata[type]?.name || warningMetadata[type.replace(/.$/,"")]?.name || type;
                    }

                    function getWarningClass(typeCode) {
                        const lastChar = typeCode.slice(-1).toUpperCase();
                        if (lastChar === "R") return "red";
                        if (lastChar === "B") return "black";
                        return "yellow";
                    }

                    function parseWindDirectionWord(word){
                        if (!word) return null;
                        const map = { 'NORTH':'N','NORTH-NORTHEAST':'NNE','NORTHEAST':'NE','EAST-NORTHEAST':'ENE','EAST':'E','EAST-SOUTHEAST':'ESE','SOUTHEAST':'SE','SOUTH-SOUTHEAST':'SSW','SOUTH':'S','SOUTH-SOUTHWEST':'SSW','SOUTHWEST':'SW','WEST-SOUTHWEST':'WSW','WEST':'W','WEST-NORTHWEST':'WNW','NORTHWEST':'NW','NORTH-NORTHWEST':'NNW','VARIABLE': null };
                        const key = String(word).toUpperCase().replace(/\s+/g,'-');
                        return map[key] ?? null;
                    }

                    async function fetchWindCsv(){
                        const now = Date.now();
                        if (now - windCsvCache.ts < 5*60*1000 && windCsvCache.rows.length) return windCsvCache.rows;
                        let csv = '';
                        try {
                            let res = await fetch(windCsvProxyUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
                            if (!res.ok) throw new Error('Proxy not OK');
                            csv = await res.text();
                        } catch (e) {
                            const res2 = await fetch(windCsvUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
                            csv = await res2.text();
                        }
                        const lines = csv.trim().split(/\r?\n/);
                        const rows = [];
                        for (let i=0;i<lines.length;i++){
                            if (i===0 && /Automatic Weather Station/i.test(lines[0])) continue;
                            const parts = lines[i].split(',');
                            if (parts.length < 5) continue;
                            const dt = parts[0].trim();
                            const station = parts[1].trim();
                            const dirWord = parts[2].trim();
                            const mean = Number(parts[3].trim());
                            const gust = Number(parts[4].trim());
                            rows.push({ dt, station, dirWord, mean, gust });
                        }
                        windCsvCache = { ts: now, rows };
                        return rows;
                    }

                    async function fetchVisibilityCsv(){
                        const now = Date.now();
                        if (now - visCsvCache.ts < 5*60*1000 && visCsvCache.rows.length) return visCsvCache.rows;
                        let csv = '';
                        try {
                            let res = await fetch(visCsvProxyUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
                            if (!res.ok) throw new Error('Proxy not OK');
                            csv = await res.text();
                        } catch (e) {
                            const res2 = await fetch(visCsvUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
                            csv = await res2.text();
                        }
                        const lines = csv.trim().split(/\r?\n/);
                        const rows = [];
                        for (let i=0;i<lines.length;i++){
                            if (i===0 && /Automatic Weather Station/i.test(lines[0])) continue;
                            const parts = lines[i].split(',');
                            if (parts.length < 3) continue;
                            const dt = parts[0].trim();
                            const station = parts[1].trim().replace(/^"|"$/g,'');
                            const visStr = parts[2].trim().replace(/^"|"$/g,'').replace(' km','');
                            const visibility = Number(visStr);
                            rows.push({ dt, station, visibility });
                        }
                        visCsvCache = { ts: now, rows };
                        return rows;
                    }

                    async function applyWindFromCsv(aqhiStation){
                        try{
                            const rows = await fetchWindCsv();
                            const mapping = stationWeatherMap[aqhiStation] || {};
                            const target = mapping.windPlace;
                            if (!target) return;
                            const rec = rows.find(r => r.station.toLowerCase() === String(target).toLowerCase()) ||
                                        rows.find(r => r.station.toLowerCase().includes(String(target).toLowerCase()));
                            if (!rec) return;
                            const abbr = parseWindDirectionWord(rec.dirWord);
                            if (isNaN(rec.mean)) {
                                windValueEl.textContent = '—';
                            } else {
                                windValueEl.textContent = `${rec.mean} km/h${abbr ? ' ' + abbr : ''}`;
                                // Wind CSV override uses same bands as live reading
                                windValueEl.style.backgroundColor = setColour(rec.mean, [9, 19, 39, 59, 79, 9999], ["#b2ff59", "#76ff03", "#ffea00", "#ff6d00", "#ff1744", "#d50000"]);
                            }
                        } catch(e){ console.warn('Wind CSV load failed', e); }
                    }

                    async function applyVisibilityFromCsv(aqhiStation){
                        try{
                            const rows = await fetchVisibilityCsv();
                            const mapping = stationWeatherMap[aqhiStation] || {};
                            const target = mapping.visPlace;
                            if (!target) return;
                            const rec = rows.find(r => r.station.toLowerCase() === String(target).toLowerCase()) ||
                                        rows.find(r => r.station.toLowerCase().includes(String(target).toLowerCase()));
                            if (!rec) return;
                            if (isNaN(rec.visibility)) {
                                visibilityValueEl.textContent = '—';
                            } else {
                                visibilityValueEl.textContent = `${rec.visibility} km`;
                                // Visibility CSV override bands: ≤3 poor, 4–5 hazy, 6–8 moderate, 9–12 good, 13–20 very good, ≥21 excellent
                                visibilityValueEl.style.backgroundColor = setColour(rec.visibility, [3, 5, 8, 12, 20, 9999], ["#ff1744", "#ffea00", "#b2ff59", "#76ff03", "#00e676", "#00e5ff"]);
                            }
                        } catch(e){ console.warn('Visibility CSV load failed', e); }
                    }

                    async function updateWeather(stationName){
                        try{
                            const res = await fetch(weatherUrl);
                            const weatherData = await res.json();
                            const mapping = stationWeatherMap[stationName] || { tempPlace: 'Hong Kong Observatory', rainPlace: 'Central & Western District' };

                            const temp = weatherData.temperature?.data?.find(d => d.place === mapping.tempPlace);
                            const rain = weatherData.rainfall?.data?.find(d => d.place === mapping.rainPlace);
                            const humidity = weatherData.humidity?.data?.[0];
                            const uv = weatherData.uvindex?.data?.[0];
                            const wind = weatherData.wind || weatherData.wind?.data?.[0] || null;
                            const visibility = weatherData.visibility?.data?.[0] || weatherData.visibility || null;

                            // Update weather icon in panel switcher button (mobile) and desktop title
                            const weatherIconEl = document.getElementById('weatherIcon');
                            const weatherIconDesktopEl = document.getElementById('weatherIconDesktop');
                            if (weatherData.icon && Array.isArray(weatherData.icon) && weatherData.icon.length > 0) {
                                const iconCode = weatherData.icon[0];
                                const iconUrl = `assets/hko/pic${iconCode}.png`;
                                
                                // Update mobile icon
                                if (weatherIconEl) {
                                    weatherIconEl.src = iconUrl;
                                    weatherIconEl.style.display = 'inline';
                                }
                                
                                // Update desktop icon
                                if (weatherIconDesktopEl) {
                                    weatherIconDesktopEl.src = iconUrl;
                                    weatherIconDesktopEl.style.display = 'inline-block';
                                }
                            } else {
                                if (weatherIconEl) weatherIconEl.style.display = 'none';
                                if (weatherIconDesktopEl) weatherIconDesktopEl.style.display = 'none';
                            }

                            // Temperature with color coding (bands: ≤0, 1–10, 11–16, 17–23, 24–29, 30–32, ≥33)
                            // Added heat stress pre-red band to distinguish hot vs very hot
                            tempValueEl.textContent = (temp?.value != null) ? `${temp.value}°C` : '—';
                            if (temp?.value != null) {
                                tempValueEl.style.backgroundColor = setColour(temp.value, [0, 10, 16, 23, 29, 32, 9999], ["#0066ff", "#00e5ff", "#00ff00", "#ffcc00", "#ff6600", "#ff3300", "#ff0000"]);
                            }

                            // Humidity with color coding (comfort-oriented bands: ≤40 dry, 41–60 comfortable, 61–75 humid, 76–85 very humid, ≥86 oppressive)
                            humidityValueEl.textContent = (humidity?.value != null) ? `${humidity.value}%` : '—';
                            if (humidity?.value != null) {
                                humidityValueEl.style.backgroundColor = setColour(humidity.value, [40, 60, 75, 85, 9999], ["#80d8ff", "#40c4ff", "#00b0ff", "#0091ea", "#01579b"]);
                            }

                            // UV Index with color coding (round to whole number) - bright greens to purples
                            uvValueEl.textContent = (uv?.value != null) ? `${Math.round(uv.value)}` : '—';
                            if (uv?.value != null) {
                                uvValueEl.style.backgroundColor = setColour(uv.value, [2, 5, 7, 10, 9999], ["#00e676", "#ffea00", "#ff6d00", "#ff1744", "#d500f9"]);
                            }

                            // Rain with color coding (intensity bands: ≤1 trace, 2–10 light, 11–30 moderate, 31–70 heavy, 71–120 very heavy, ≥121 extreme)
                            rainValueEl.textContent = (typeof rain?.max === 'number') ? `${rain.max} mm` : '—';
                            if (typeof rain?.max === 'number') {
                                rainValueEl.style.backgroundColor = setColour(rain.max, [1, 10, 30, 70, 120, 9999], ["#ffea00", "#2979ff", "#ff6d00", "#ff1744", "#800000", "#000000"]);
                            }

                            // Wind with color coding - vibrant greens to yellows to reds
                            const windSpeed = (typeof wind?.speed === 'number') ? wind.speed : (typeof wind?.speed?.value === 'number') ? wind.speed.value : null;
                            const windDir = wind?.direction?.value || wind?.direction || wind?.compassDirection || null;
                            windValueEl.textContent = (windSpeed != null) ? `${windSpeed} km/h${windDir ? ' ' + windDir : ''}` : '—';
                            if (windSpeed != null) {
                                // Wind bands: ≤9 calm/light, 10–19 gentle, 20–39 moderate, 40–59 fresh/strong, 60–79 very strong, ≥80 gale+ 
                                windValueEl.style.backgroundColor = setColour(windSpeed, [9, 19, 39, 59, 79, 9999], ["#b2ff59", "#76ff03", "#ffea00", "#ff6d00", "#ff1744", "#d50000"]);
                            }

                            // Visibility with color coding - reds to greens (reversed scale)
                            const visVal = (typeof visibility?.value === 'number') ? visibility.value : (typeof visibility?.km === 'number') ? visibility.km : null;
                            visibilityValueEl.textContent = (visVal != null) ? `${visVal} km` : '—';
                            if (visVal != null) {
                                visibilityValueEl.style.backgroundColor = setColour(visVal, [3, 5, 8, 12, 20, 9999], ["#ff1744", "#ffea00", "#b2ff59", "#76ff03", "#00e676", "#00e5ff"]);
                            }

                            // Override with station-specific CSV where available
                            await applyWindFromCsv(stationName);
                            await applyVisibilityFromCsv(stationName);
                        } catch(e){
                            console.error('Weather fetch failed', e);
                            tempValueEl.textContent = humidityValueEl.textContent = uvValueEl.textContent = rainValueEl.textContent = windValueEl.textContent = visibilityValueEl.textContent = '—';
                        }
                    }

                    // Forecast rotation for desktop weather panel header
                    // Simple static 3-day forecast display
                    // Store forecast cards for dynamic visibility control
                    let forecastCards = [];

                    async function initStaticForecast() {
                        try {
                            const res = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en');
                            const data = await res.json();
                            
                            if (data.weatherForecast && data.weatherForecast.length >= 3) {
                                const today = new Date();
                                const nextDay = new Date(today);
                                nextDay.setDate(nextDay.getDate() + 2);
                                
                                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                
                                const forecasts = [
                                    {
                                        icon: data.weatherForecast[0].ForecastIcon,
                                        label: 'Today',
                                        minTemp: data.weatherForecast[0].forecastMintemp?.value,
                                        maxTemp: data.weatherForecast[0].forecastMaxtemp?.value
                                    },
                                    {
                                        icon: data.weatherForecast[1].ForecastIcon,
                                        label: 'Tomorrow',
                                        minTemp: data.weatherForecast[1].forecastMintemp?.value,
                                        maxTemp: data.weatherForecast[1].forecastMaxtemp?.value
                                    },
                                    {
                                        icon: data.weatherForecast[2].ForecastIcon,
                                        label: dayNames[nextDay.getDay()],
                                        minTemp: data.weatherForecast[2].forecastMintemp?.value,
                                        maxTemp: data.weatherForecast[2].forecastMaxtemp?.value
                                    }
                                ];
                                
                                const container = document.getElementById('staticForecast');
                                container.style.display = 'flex';
                                container.innerHTML = ''; // Clear existing cards
                                forecastCards = []; // Reset array
                                
                                // Create three forecast cards
                                forecasts.forEach((forecast, index) => {
                                    const card = document.createElement('div');
                                    card.className = `forecast-card-${index}`;
                                    card.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 8px; min-width: 70px;';
                                    
                                    card.innerHTML = `
                                        <img src="assets/hko/pic${forecast.icon}.png" alt="${forecast.label}" style="width: 32px; height: 32px; object-fit: contain;">
                                        <span style="font-size: 10px; color: #ffffff; font-weight: 700; white-space: nowrap;">${forecast.minTemp}° - ${forecast.maxTemp}°</span>
                                        <span style="font-size: 8px; color: #d1d5db; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${forecast.label}</span>
                                    `;
                                    
                                    container.appendChild(card);
                                    forecastCards.push(card);
                                });
                            }
                        } catch (e) {
                            console.error('Forecast display failed', e);
                        }
                    }

                    // Update forecast card visibility based on warning count
                    function updateForecastVisibility(warningCount) {
                        if (forecastCards.length > 0) {
                            const lastCard = forecastCards[forecastCards.length - 1];
                            // Only hide the 3rd day forecast when there are 4 or more active warnings (crowded header scenario)
                            if (warningCount >= 4) {
                                lastCard.style.display = 'none';
                            } else {
                                lastCard.style.display = 'flex';
                            }
                        }
                    }

                                async function updatePollutants(stationName){
                        try{
                            const res = await fetchWithRetry(pollutantUrl);
                            const xmlText = await res.text();
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                            const records = Array.from(xmlDoc.getElementsByTagName('PollutantConcentration'))
                                .filter(node => node.getElementsByTagName('StationName')[0]?.textContent === stationName);
                            if (!records.length) throw new Error('No data for station');
                            const latest = records[records.length - 1];

                            const get = tag => latest.getElementsByTagName(tag)[0]?.textContent ?? '—';
                            
                            // NO2 with color coding - more vivid air quality scale
                            const no2 = get('NO2');
                            no2ValueEl.textContent = no2;
                            if (no2 !== '—') {
                                no2ValueEl.style.backgroundColor = setColour(Number(no2), [40, 90, 120, 230, 340, 9999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                no2ValueEl.style.color = '#111827';
                            } else {
                                no2ValueEl.style.backgroundColor = '#9ca3af';
                                no2ValueEl.style.color = '#ffffff';
                            }

                            // O3 with color coding - more vivid air quality scale
                            const o3 = get('O3');
                            o3ValueEl.textContent = o3;
                            if (o3 !== '—') {
                                o3ValueEl.style.backgroundColor = setColour(Number(o3), [50, 100, 130, 240, 380, 9999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                o3ValueEl.style.color = '#111827';
                            } else {
                                o3ValueEl.style.backgroundColor = '#9ca3af';
                                o3ValueEl.style.color = '#ffffff';
                            }

                            // SO2 with color coding - more vivid air quality scale
                            const so2 = get('SO2');
                            so2ValueEl.textContent = so2;
                            if (so2 !== '—') {
                                so2ValueEl.style.backgroundColor = setColour(Number(so2), [100, 200, 350, 500, 750, 9999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                so2ValueEl.style.color = '#111827';
                            } else {
                                so2ValueEl.style.backgroundColor = '#9ca3af';
                                so2ValueEl.style.color = '#ffffff';
                            }

                            // CO with color coding - more vivid air quality scale
                            const co = get('CO');
                            coValueEl.textContent = co;
                            if (co !== '—') {
                                coValueEl.style.backgroundColor = setColour(Number(co), [4000, 20000, 35000, 50000, 75000, 999999999999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                coValueEl.style.color = '#111827';
                            } else {
                                coValueEl.style.backgroundColor = '#9ca3af';
                                coValueEl.style.color = '#ffffff';
                            }

                            // PM10 with color coding - more vivid air quality scale
                            const pm10 = get('PM10');
                            pm10ValueEl.textContent = pm10;
                            if (pm10 !== '—') {
                                pm10ValueEl.style.backgroundColor = setColour(Number(pm10), [20, 40, 50, 100, 150, 9999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                pm10ValueEl.style.color = '#111827';
                            } else {
                                pm10ValueEl.style.backgroundColor = '#9ca3af';
                                pm10ValueEl.style.color = '#ffffff';
                            }

                            // PM2.5 with color coding - more vivid air quality scale
                            const pm25 = get('PM2.5');
                            pm25ValueEl.textContent = pm25;
                            if (pm25 !== '—') {
                                pm25ValueEl.style.backgroundColor = setColour(Number(pm25), [10, 20, 25, 50, 75, 9999], ["#00e5ff", "#00e676", "#ffea00", "#ff3d00", "#d50000", "#aa00ff"]);
                                pm25ValueEl.style.color = '#111827';
                            } else {
                                pm25ValueEl.style.backgroundColor = '#9ca3af';
                                pm25ValueEl.style.color = '#ffffff';
                            }
                                    } catch(e){
                            console.warn('Pollutants fetch failed', e);
                            no2ValueEl.textContent = o3ValueEl.textContent = so2ValueEl.textContent = coValueEl.textContent = pm10ValueEl.textContent = pm25ValueEl.textContent = '—';
                                        const s = document.getElementById('sd-status');
                                        s.style.display = 'block';
                                        s.textContent = 'Pollutant values unavailable (proxy/CORS). Open the site on GitHub Pages to see full data.';
                        }
                    }

                    // Get AQHI color based on value
                    function getAQHIColor(aqhi) {
                        if (aqhi <= 3) return '#00e676'; // Low - green
                        if (aqhi <= 6) return '#ffea00'; // Moderate - yellow
                        if (aqhi <= 7) return '#ff6d00'; // High - orange
                        if (aqhi <= 10) return '#ff1744'; // Very High - red
                        return '#d500f9'; // Serious - purple
                    }

                    // Get text color for AQHI badge (dark text for yellow)
                    function getAQHITextColor(aqhi) {
                        if (aqhi >= 4 && aqhi <= 6) return '#111827'; // Dark text for yellow
                        return '#ffffff'; // White text for all others
                    }

                    // Update AQHI badge in Air Quality button
                    async function updateAQHIBadge() {
                        try {
                            const res = await fetchWithRetry(aqhiUrl);
                            const data = await res.json();
                            
                            // Calculate average AQHI across all stations
                            const aqhiValues = data.map(s => s.aqhi).filter(v => v != null && !isNaN(v));
                            if (aqhiValues.length > 0) {
                                const avgAQHI = Math.round(aqhiValues.reduce((sum, v) => sum + v, 0) / aqhiValues.length);
                                
                                // Update mobile badge
                                const badge = document.getElementById('aqhiBadge');
                                badge.textContent = avgAQHI;
                                badge.style.backgroundColor = getAQHIColor(avgAQHI);
                                badge.style.color = getAQHITextColor(avgAQHI);
                                badge.style.display = 'inline-block';
                                badge.title = `Hong Kong Average AQHI: ${avgAQHI} (Click for info)`;
                                
                                // Update desktop badge
                                const badgeDesktop = document.getElementById('aqhiBadgeDesktop');
                                badgeDesktop.textContent = avgAQHI;
                                badgeDesktop.style.backgroundColor = getAQHIColor(avgAQHI);
                                badgeDesktop.style.color = getAQHITextColor(avgAQHI);
                                badgeDesktop.style.display = 'inline-block';
                                badgeDesktop.title = `Hong Kong Average AQHI: ${avgAQHI} (Click for info)`;
                                // apply glow severity
                                badgeDesktop.classList.remove('low','moderate','severe','pulse');
                                if (avgAQHI <= 3) {
                                    badgeDesktop.classList.add('low');
                                } else if (avgAQHI <= 7) {
                                    badgeDesktop.classList.add('moderate','pulse');
                                } else {
                                    badgeDesktop.classList.add('severe','pulse');
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to update AQHI badge', e);
                        }
                    }

                    // init
                    loadStations();
                    checkTodayHoliday();
                    updateAQHIBadge();
                    initStaticForecast();
                })();

        // Live clock display in header
        function updateClock() {
            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const dayName = days[now.getDay()];
            const day = now.getDate();
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            const dateStr = `${dayName}, ${day} ${month} ${year}`;
            const timeStr = `${hours}:${minutes}`;
            
            const el = document.getElementById('currentDateTime');
            if (el) {
                el.textContent = `${dateStr} • ${timeStr}`;
            }
        }
        
        // Update clock immediately and then every minute
        updateClock();
        setInterval(updateClock, 60000);

        // Auto-refresh functionality
        let refreshCountdown;
        let secondsRemaining = 900; // 15 minutes in seconds
        const REFRESH_DURATION = 900; // 15 minutes

        function updateRefreshUI() {
            const progressBar = document.getElementById('refreshProgressBar');
            
            if (progressBar) {
                const percentage = (secondsRemaining / REFRESH_DURATION) * 100;
                progressBar.style.width = `${percentage}%`;
            }
        }

        function startRefreshCountdown() {
            secondsRemaining = REFRESH_DURATION;
            updateRefreshUI();
            
            if (refreshCountdown) {
                clearInterval(refreshCountdown);
            }
            
            refreshCountdown = setInterval(() => {
                secondsRemaining--;
                updateRefreshUI();
                
                if (secondsRemaining <= 0) {
                    performRefresh();
                }
            }, 1000);
        }

        async function performRefresh() {
            console.log('Auto-refreshing dashboard data...');
            
            const progressBar = document.getElementById('refreshProgressBar');
            
            // Flash green on refresh
            if (progressBar) {
                progressBar.style.background = 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)';
                progressBar.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.6)';
            }
            
            try {
                // Get current station
                const stationSelect = document.getElementById('stationSelector');
                const currentStation = stationSelect?.value;
                
                // Refresh all data
                if (currentStation) {
                    await updateForStation(currentStation);
                }
                await loadWarnings();
                await checkTodayHoliday();
                
                console.log('Dashboard refreshed successfully');
                if (currentStation) {
                    announceDataRefreshed(currentStation);
                }
            } catch (error) {
                console.error('Error refreshing dashboard:', error);
                // Flash red on error
                if (progressBar) {
                    progressBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
                }
            }
            
            // Reset color after brief delay
            setTimeout(() => {
                if (progressBar) {
                    progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
                    progressBar.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
                }
            }, 800);
            
            // Restart countdown
            startRefreshCountdown();
        }

        // Start countdown when page loads
        window.addEventListener('load', () => {
            startRefreshCountdown();
        });
 
    

    // Responsive panel switching for mobile
    function showPanel(panel) {
        var weatherPanel = document.getElementById('weatherPanel');
        var airPanel = document.getElementById('airPanel');
        var weatherBtn = document.getElementById('weatherBtn');
        var airBtn = document.getElementById('airBtn');
        if (panel === 'weather') {
            weatherPanel.classList.add('active');
            airPanel.classList.remove('active');
            weatherBtn.classList.add('active');
            airBtn.classList.remove('active');
        } else {
            weatherPanel.classList.remove('active');
            airPanel.classList.add('active');
            weatherBtn.classList.remove('active');
            airBtn.classList.add('active');
        }
    }
    // Show/hide panel switcher based on screen size
    function handlePanelSwitcher() {
        var switcher = document.getElementById('panelSwitcher');
        if (window.innerWidth <= 700) {
            switcher.style.display = 'flex';
            showPanel('weather');
        } else {
            switcher.style.display = 'none';
            document.getElementById('weatherPanel').classList.add('active');
            document.getElementById('airPanel').classList.add('active');
        }
    }
    window.addEventListener('resize', handlePanelSwitcher);
    window.addEventListener('DOMContentLoaded', handlePanelSwitcher);

    // Interactive Tour System
    const tourSteps = [
        {
            element: '#stationSelector',
            title: 'Select Your Station',
            text: 'Choose from various monitoring stations across Hong Kong to see localized weather and air quality data.',
            position: 'bottom'
        },
        {
            element: '.metric-label img.clickable-icon',
            title: 'Click for Details',
            text: 'Click any weather or pollutant icon to see detailed information, historical trends, and 7-day forecasts where available.',
            position: 'right'
        },
        {
            element: '#warningsContainer',
            title: 'Weather Warnings',
            text: 'Active weather warnings appear here. Click any warning icon to see full details about current alerts.',
            position: 'bottom'
        },
        {
            element: '.metric-value',
            title: 'Color-Coded Values',
            text: 'Metric values are color-coded to show conditions at a glance. Darker colors indicate more severe conditions.',
            position: 'left'
        },
        {
            element: '.footer-buttons button:first-child',
            title: 'Additional Data',
            text: 'Access traffic conditions and news updates via footer buttons. Data sources are credited below.',
            position: 'top'
        }
    ];

    let currentTourStep = 0;
    let tourOverlay = null;
    let tourSpotlight = null;
    let tourTooltip = null;

    function startTour() {
        // Check if first visit
        const hasSeenTour = localStorage.getItem('hkdash_tour_seen');
        
        // Create overlay elements
        tourOverlay = document.createElement('div');
        tourOverlay.className = 'tour-overlay';
        tourOverlay.style.display = 'block';
        
        tourSpotlight = document.createElement('div');
        tourSpotlight.className = 'tour-spotlight';
        
        tourTooltip = document.createElement('div');
        tourTooltip.className = 'tour-tooltip';
        
        document.body.appendChild(tourOverlay);
        document.body.appendChild(tourSpotlight);
        document.body.appendChild(tourTooltip);
        
        currentTourStep = 0;
        showTourStep();
    }

    function showTourStep() {
        if (currentTourStep >= tourSteps.length) {
            endTour();
            return;
        }

        const step = tourSteps[currentTourStep];
        const targetElement = document.querySelector(step.element);
        
        if (!targetElement) {
            // Skip if element not found
            currentTourStep++;
            showTourStep();
            return;
        }

        // Position spotlight
        const rect = targetElement.getBoundingClientRect();
        tourSpotlight.style.top = (rect.top - 8) + 'px';
        tourSpotlight.style.left = (rect.left - 8) + 'px';
        tourSpotlight.style.width = (rect.width + 16) + 'px';
        tourSpotlight.style.height = (rect.height + 16) + 'px';

        // Position tooltip
        let tooltipTop, tooltipLeft;
        const tooltipWidth = 320;
        const tooltipHeight = 180; // approximate
        
        switch (step.position) {
            case 'right':
                tooltipTop = rect.top;
                tooltipLeft = rect.right + 20;
                break;
            case 'left':
                tooltipTop = rect.top;
                tooltipLeft = rect.left - tooltipWidth - 20;
                break;
            case 'top':
                tooltipTop = rect.top - tooltipHeight - 20;
                tooltipLeft = rect.left;
                break;
            case 'bottom':
            default:
                tooltipTop = rect.bottom + 20;
                tooltipLeft = rect.left;
        }

        // Keep tooltip on screen
        tooltipTop = Math.max(20, Math.min(tooltipTop, window.innerHeight - tooltipHeight - 20));
        tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 20));

        tourTooltip.style.top = tooltipTop + 'px';
        tourTooltip.style.left = tooltipLeft + 'px';

        // Set tooltip content
        const isLast = currentTourStep === tourSteps.length - 1;
        tourTooltip.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.text}</p>
            <div class="tour-controls">
                <span class="tour-progress">Step ${currentTourStep + 1} of ${tourSteps.length}</span>
                <div class="tour-buttons">
                    <button class="tour-btn tour-btn-skip" onclick="endTour()">Skip</button>
                    <button class="tour-btn tour-btn-next" onclick="nextTourStep()">${isLast ? 'Finish' : 'Next'}</button>
                </div>
            </div>
        `;
    }

    function nextTourStep() {
        currentTourStep++;
        showTourStep();
    }

    function endTour() {
        if (tourOverlay) tourOverlay.remove();
        if (tourSpotlight) tourSpotlight.remove();
        if (tourTooltip) tourTooltip.remove();
        
        // Mark tour as seen
        localStorage.setItem('hkdash_tour_seen', 'true');
    }

    // Auto-start tour on first visit
    window.addEventListener('DOMContentLoaded', function() {
        const hasSeenTour = localStorage.getItem('hkdash_tour_seen');
        if (!hasSeenTour) {
            // Wait a bit for page to settle
            setTimeout(startTour, 1500);
        }
    });

    // Loading Screen Handler
    (function() {
        const loadingScreen = document.getElementById('loadingScreen');
        const minDisplayTime = 3000; // 3 seconds minimum
        const startTime = Date.now();

        function hideLoadingScreen() {
            if (!loadingScreen) return;
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, remainingTime);
        }

        // Failsafe: forcibly hide splash after 6 seconds
        setTimeout(() => {
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 6000);

        if (document.readyState === 'complete') {
            hideLoadingScreen();
        } else {
            window.addEventListener('load', hideLoadingScreen);
        }
    })();

