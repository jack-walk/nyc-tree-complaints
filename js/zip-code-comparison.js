/**
 * Zip Code Comparison Tool Component
 * Allows users to search zip codes and view complaint statistics
 */

class ZipCodeComparison {
  constructor(config) {
    this.complaintsFile = config.complaintsFile || config.dataFile || 'data/complaints_all_zip_codes copy.csv';
    this.neighborhoodsFile = config.neighborhoodsFile || 'data/neighborhoods.csv';
    this.containerSelector = config.containerSelector || '#zip-comparison-root';
    this.complaintsData = [];
    this.neighborhoodData = [];
    this.zipStats = {}; // Organized by zip code
    this.neighborhoodStats = {}; // Organized by neighborhood name
    this.zipCodeRankings = []; // Ranked zip codes
    this.neighborhoodRankings = []; // Ranked neighborhoods
    this.allProblemTypes = []; // All possible problem types
    this.complaintSections = [
      { label: 'Blocking Street', types: ['Blocking Street'] },
      { label: 'Clear Street Light', types: ['Clear Street Light'] },
      { label: 'Dead Branches in Tree', types: ['Dead Branches in Tree'] },
      { label: 'Hitting Building', types: ['Hitting Building'] },
      {
        label: 'Hitting Power Line',
        types: ['Hitting Phone/Cable Lines', 'Hitting Power Lines', 'Hitting Power/Phone Lines']
      },
      { label: 'Traffic Sign or Signal Blocked', types: ['Traffic Sign or Signal Blocked'] }
    ];
    this.loadData();
  }

  /**
   * Loads and parses CSV data
   */
  loadData() {
    Promise.all([
      this.fetchCSV(this.complaintsFile),
      this.fetchCSV(this.neighborhoodsFile)
    ])
      .then(([complaintsText, neighborhoodsText]) => {
        this.processData(complaintsText, neighborhoodsText);
        this.render();
      })
      .catch(error => console.error('Error loading data:', error));
  }

  /**
   * Fetches a CSV file as text
   */
  fetchCSV(filePath) {
    return fetch(filePath).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status}`);
      }
      return response.text();
    });
  }

  /**
   * Parses CSV text into an array of objects
   */
  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = this.parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      data.push(obj);
    }

    return data;
  }

  /**
   * Parses a single CSV line, handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  /**
   * Normalizes a zip code to a 5-digit string
   */
  normalizeZip(zipCode) {
    const match = String(zipCode || '').match(/\d{5}/);
    return match ? match[0] : '';
  }

  /**
   * Normalizes text for matching
   */
  normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * Builds search suggestions for zip codes and neighborhoods
   */
  getSuggestions(query, limit = 8) {
    const normalizedQuery = this.normalizeText(query);
    const normalizedZipQuery = this.normalizeZip(query);

    if (!normalizedQuery || normalizedQuery.length < 3) {
      return [];
    }

    const suggestions = [];
    const seen = new Set();
    const hasZipQuery = /^\d+$/.test(normalizedZipQuery);

    const addSuggestion = suggestion => {
      const key = `${suggestion.type}:${suggestion.value}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      suggestions.push(suggestion);
    };

    const matchingZipCodes = new Map();

    if (hasZipQuery) {
      Object.values(this.zipStats)
        .filter(zipData => zipData.zipCode.startsWith(normalizedZipQuery))
        .forEach(zipData => {
          matchingZipCodes.set(zipData.zipCode, zipData);
        });
    }

    this.neighborhoodData.forEach(row => {
      const zipCode = this.normalizeZip(row['Zip Code']);
      const neighborhood = row['Neighborhood'] || '';
      const borough = row['Borough'] || 'Data Not Available';
      const normalizedNeighborhood = this.normalizeText(neighborhood);
      const normalizedBorough = this.normalizeText(borough);
      
      // Check if the full query phrase matches the neighborhood or borough
      const matchesNeighborhood = normalizedNeighborhood.startsWith(normalizedQuery)
        || normalizedNeighborhood.includes(normalizedQuery);
      const matchesBorough = normalizedBorough.startsWith(normalizedQuery) || normalizedBorough.includes(normalizedQuery);

      if ((hasZipQuery && zipCode.startsWith(normalizedZipQuery)) || matchesNeighborhood || matchesBorough) {
        const zipData = this.zipStats[zipCode] || { zipCode };
        matchingZipCodes.set(zipCode, zipData);
      }
    });

    [...matchingZipCodes.values()]
      .map(zipData => {
        const meta = this.neighborhoodRowsByZip[zipData.zipCode];
        const neighborhood = meta?.neighborhood || 'Data Not Available';
        const borough = meta?.borough || 'Data Not Available';
        return {
          type: 'zip',
          value: zipData.zipCode,
          label: `Zip Code ${zipData.zipCode}`,
          detail: `${neighborhood} • ${borough}`,
          sortKey: zipData.zipCode.startsWith(normalizedZipQuery) ? 0 : 1,
          neighborhood
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey || a.value.localeCompare(b.value))
      .forEach(addSuggestion);

    return suggestions.slice(0, limit);
  }

  /**
   * Renders suggestions below the input field
   */
  renderSuggestions(query) {
    const suggestionsBox = document.getElementById('suggestions-box');
    if (!suggestionsBox) {
      return;
    }

    const suggestions = this.getSuggestions(query);
    suggestionsBox.innerHTML = '';

    if (!query || suggestions.length === 0) {
      suggestionsBox.style.display = 'none';
      return;
    }

    suggestions.forEach(suggestion => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'suggestion-item';
      option.innerHTML = `
        <span class="suggestion-item-topline">
          <span class="suggestion-item-label">${suggestion.label}</span>
        </span>
        <span class="suggestion-item-detail">${suggestion.detail}</span>
      `;
      option.addEventListener('click', () => {
        const input = document.getElementById('zip-code-input');
        input.value = suggestion.type === 'zip' ? suggestion.value : suggestion.label;
        suggestionsBox.style.display = 'none';
        this.performSearch();
      });
      suggestionsBox.appendChild(option);
    });

    suggestionsBox.style.display = 'block';
  }

  /**
   * Hides the suggestions dropdown
   */
  hideSuggestions() {
    const suggestionsBox = document.getElementById('suggestions-box');
    if (suggestionsBox) {
      suggestionsBox.style.display = 'none';
    }
  }

  /**
   * Processes raw data into joined zip and neighborhood structures
   */
  processData(complaintsText, neighborhoodsText) {
    this.complaintsData = this.parseCSV(complaintsText);
    this.neighborhoodData = this.parseCSV(neighborhoodsText);

    this.buildZipStats();
    this.buildNeighborhoodStats();
    this.buildRankings();
  }

  /**
   * Builds zip-level complaint totals
   */
  buildZipStats() {
    this.complaintsData.forEach(row => {
      const zipCode = this.normalizeZip(row['Incident Zip']);
      const problemType = row['Problem Detail (formerly Descriptor)'];
      const count = parseInt(row['count_descriptor'], 10) || 0;

      if (!zipCode) {
        return;
      }

      if (!this.allProblemTypes.includes(problemType)) {
        this.allProblemTypes.push(problemType);
      }

      if (!this.zipStats[zipCode]) {
        this.zipStats[zipCode] = {
          zipCode,
          totalComplaints: 0,
          complaintsByType: {},
          neighborhood: null,
          borough: null,
          neighborhoods: new Set(),
          hasIncompleteData: false
        };
      }

      this.zipStats[zipCode].totalComplaints += count;
      this.zipStats[zipCode].complaintsByType[problemType] =
        (this.zipStats[zipCode].complaintsByType[problemType] || 0) + count;
    });

    this.allProblemTypes.sort();
  }

  /**
   * Builds neighborhood-level complaint totals from the neighborhood CSV
   */
  buildNeighborhoodStats() {
    this.neighborhoodRowsByZip = {};

    this.neighborhoodData.forEach(row => {
      const zipCode = this.normalizeZip(row['Zip Code']);
      const neighborhood = row['Neighborhood'] || 'Unknown Neighborhood';
      const borough = row['Borough'] || 'Unknown Borough';
      const zipData = this.zipStats[zipCode] || {
        zipCode,
        totalComplaints: 0,
        complaintsByType: {},
        hasIncompleteData: true
      };

      const rowInfo = {
        zipCode,
        neighborhood,
        borough,
        totalComplaints: zipData.totalComplaints,
        complaintsByType: zipData.complaintsByType,
        hasComplaintData: Boolean(this.zipStats[zipCode])
      };

      if (zipCode) {
        this.neighborhoodRowsByZip[zipCode] = rowInfo;
      }

      const neighborhoodKey = this.normalizeText(neighborhood);

      if (!this.neighborhoodStats[neighborhoodKey]) {
        this.neighborhoodStats[neighborhoodKey] = {
          neighborhood,
          neighborhoodKey,
          boroughs: new Set(),
          zipCodes: [],
          totalComplaints: 0,
          complaintsByType: {},
          sourceRows: [],
          hasIncompleteData: false
        };
      }

      const group = this.neighborhoodStats[neighborhoodKey];
      group.boroughs.add(borough);
      group.zipCodes.push(zipCode);
      group.sourceRows.push(rowInfo);
      group.totalComplaints += zipData.totalComplaints;

      if (!rowInfo.hasComplaintData) {
        group.hasIncompleteData = true;
      }

      this.allProblemTypes.forEach(type => {
        if (zipData.complaintsByType[type] != null) {
          group.complaintsByType[type] =
            (group.complaintsByType[type] || 0) + zipData.complaintsByType[type];
        }
      });
    });
  }

  /**
   * Builds rank lists for zip codes and neighborhoods
   */
  buildRankings() {
    Object.values(this.zipStats).forEach(zipData => {
      zipData.hasIncompleteData = this.allProblemTypes.some(type => !(type in zipData.complaintsByType));
    });

    Object.values(this.neighborhoodStats).forEach(neighborhoodData => {
      neighborhoodData.hasIncompleteData = this.allProblemTypes.some(type => !(type in neighborhoodData.complaintsByType));
    });

    this.zipCodeRankings = Object.values(this.zipStats)
      .sort((a, b) => b.totalComplaints - a.totalComplaints)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    this.neighborhoodRankings = Object.values(this.neighborhoodStats)
      .sort((a, b) => b.totalComplaints - a.totalComplaints)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /**
   * Gets a zip code's rank percentile
   */
  getPercentile(rank, total) {
    return ((total - rank + 1) / total * 100).toFixed(1);
  }

  /**
   * Searches by zip code or neighborhood
   */
  searchLocation(query) {
    const normalizedZip = this.normalizeZip(query);
    if (/^\d{5}$/.test(normalizedZip) && this.zipStats[normalizedZip]) {
      return this.buildSearchResultFromZip(this.zipStats[normalizedZip]);
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return null;
    }

    const neighborhoodMatches = Object.values(this.neighborhoodStats).filter(group => {
      const name = this.normalizeText(group.neighborhood);
      return name === normalizedQuery || name.includes(normalizedQuery) || normalizedQuery.includes(name);
    });

    if (neighborhoodMatches.length === 1) {
      return this.buildSearchResultFromNeighborhood(neighborhoodMatches[0]);
    }

    if (neighborhoodMatches.length > 1) {
      return {
        type: 'ambiguous',
        matches: neighborhoodMatches.map(match => ({
          neighborhood: match.neighborhood,
          boroughs: Array.from(match.boroughs).join(', '),
          zipCodes: match.zipCodes.filter(Boolean).join(', ')
        }))
      };
    }

    return null;
  }

  /**
   * Returns a search result object for a single zip code
   */
  buildSearchResultFromZip(zipData) {
    const zipMeta = this.neighborhoodRowsByZip[zipData.zipCode] || null;
    const ranking = this.zipCodeRankings.find(item => item.zipCode === zipData.zipCode);

    return {
      mode: 'zip',
      entityLabel: `Zip Code ${zipData.zipCode}`,
      title: `Zip Code ${zipData.zipCode}`,
      subtitle: zipMeta
        ? `${zipMeta.neighborhood} • ${zipMeta.borough}`
        : 'Neighborhood Data Not Available',
      badgeValues: [zipData.zipCode, zipMeta?.neighborhood, zipMeta?.borough].filter(Boolean),
      totalComplaints: zipData.totalComplaints,
      complaintsByType: zipData.complaintsByType,
      rank: ranking ? ranking.rank : 1,
      rankingTotal: this.zipCodeRankings.length,
      rankingLabel: 'zip codes',
      rankDetail: `Top ${this.getPercentile(ranking ? ranking.rank : 1, this.zipCodeRankings.length)}% among zip codes`,
      sectionData: this.buildComplaintSections(zipData.complaintsByType),
      hasIncompleteData: zipData.hasIncompleteData
    };
  }

  /**
   * Returns a search result object for a neighborhood
   */
  buildSearchResultFromNeighborhood(neighborhoodGroup) {
    const boroughs = Array.from(neighborhoodGroup.boroughs).filter(Boolean);
    const zipCodes = [...new Set(neighborhoodGroup.zipCodes.filter(Boolean))];
    const zipResults = zipCodes
      .map(zipCode => this.zipStats[zipCode])
      .filter(Boolean)
      .sort((a, b) => a.zipCode.localeCompare(b.zipCode))
      .map(zipData => this.buildSearchResultFromZip(zipData));

    return {
      mode: 'neighborhood',
      entityLabel: neighborhoodGroup.neighborhood,
      title: neighborhoodGroup.neighborhood,
      subtitle: boroughs.length ? boroughs.join(', ') : 'Borough Data Not Available',
      badgeValues: [neighborhoodGroup.neighborhood, ...boroughs, ...zipCodes.slice(0, 4)].filter(Boolean),
      zipResults,
      zipCodes,
      hasIncompleteData: neighborhoodGroup.hasIncompleteData
    };
  }

  /**
   * Builds the display sections for complaint breakdown
   */
  buildComplaintSections(complaintsByType) {
    return this.complaintSections.map(section => {
      const availableTypes = section.types.filter(type => type in complaintsByType);
      const total = availableTypes.reduce((sum, type) => sum + complaintsByType[type], 0);
      const hasData = availableTypes.length > 0;

      return {
        label: section.label,
        types: section.types,
        grouped: false,
        hasData,
        total,
        subitems: []
      };
    });
  }

  /**
   * Renders the component
   */
  render() {
    const container = document.querySelector(this.containerSelector);
    if (!container) {
      console.error(`Container not found: ${this.containerSelector}`);
      return;
    }

    container.innerHTML = `
      <div class="zip-comparison-tool">
        <h1>Compare Complaints by Neighborhood or Zip Code</h1>
        <p>
          Search by a 5-digit zip code or neighborhood name to see total tree complaints,
          complaint breakdowns, and how the area ranks citywide.
        </p>

        <div class="search-section">
          <label for="zip-code-input">Enter Your Zip Code or Neighborhood:</label>
          <div class="search-input-wrap">
            <input 
              type="text" 
              id="zip-code-input" 
              class="zip-code-input" 
              placeholder="e.g., 11203 or Marine Park"
              autocomplete="off"
            />
            <div id="suggestions-box" class="suggestions-box" style="display:none;"></div>
          </div>
          <button id="search-btn" class="search-btn">Search</button>
        </div>

        <div id="results-section" class="results-section" style="display:none;">
          <div class="results-content">
            <h2 id="zip-code-header"></h2>
            <p id="result-subheader" class="result-subheader"></p>
            <div id="result-tags" class="result-tags"></div>
            
            <div class="result-card total-complaints">
              <div class="result-label">Total Tree Complaints</div>
              <div id="total-complaints" class="result-value">-</div>
            </div>

            <div class="result-card ranking">
              <div class="result-label">City Ranking</div>
              <div id="ranking-value" class="result-value">-</div>
              <div id="ranking-detail" class="result-detail">-</div>
            </div>

            <div class="complaints-by-type">
              <h3>Complaints by Type</h3>
              <div id="complaints-list" class="complaints-list"></div>
            </div>

            <button id="search-again-btn" class="search-again-btn">Search Another Neighborhood or Zip Code</button>
          </div>
        </div>

        <div id="error-section" class="error-section" style="display:none;">
          <p id="error-message"></p>
        </div>

        <div id="no-results-section" class="no-results-section" style="display:none;">
          <p id="no-results-message">No data found for this neighborhood or zip code. Please try another.</p>
        </div>
      </div>
    `;

    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });

    document.getElementById('zip-code-input').addEventListener('input', (e) => {
      this.renderSuggestions(e.target.value);
    });

    document.getElementById('zip-code-input').addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    document.getElementById('zip-code-input').addEventListener('blur', () => {
      window.setTimeout(() => this.hideSuggestions(), 150);
    });

    document.getElementById('search-again-btn').addEventListener('click', () => {
      this.resetSearch();
    });
  }

  /**
   * Performs the search
   */
  performSearch() {
    const query = document.getElementById('zip-code-input').value.trim();
    const resultsSection = document.getElementById('results-section');
    const errorSection = document.getElementById('error-section');
    const noResultsSection = document.getElementById('no-results-section');

    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    noResultsSection.style.display = 'none';

    if (!query) {
      document.getElementById('error-message').textContent = 'Please enter a zip code or neighborhood.';
      errorSection.style.display = 'block';
      return;
    }

    const result = this.searchLocation(query);

    if (!result) {
      document.getElementById('no-results-message').textContent = 'No data found for this neighborhood or zip code. Please try another.';
      noResultsSection.style.display = 'block';
      return;
    }

    if (result.type === 'ambiguous') {
      const matchesText = result.matches
        .map(match => `${match.neighborhood} (${match.boroughs}${match.zipCodes ? `, zips: ${match.zipCodes}` : ''})`)
        .join('; ');
      document.getElementById('error-message').textContent = `Multiple neighborhoods match that search: ${matchesText}. Please be more specific.`;
      errorSection.style.display = 'block';
      return;
    }

    this.displayResults(result);
    resultsSection.style.display = 'block';

    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  /**
   * Displays search results
   */
  displayResults(result) {
    document.getElementById('zip-code-header').textContent = result.title;
    document.getElementById('result-subheader').textContent = result.subtitle;

    const tags = document.getElementById('result-tags');
    tags.innerHTML = '';
    result.badgeValues.forEach(value => {
      const tag = document.createElement('span');
      tag.className = 'result-tag';
      tag.textContent = value;
      tags.appendChild(tag);
    });

    const complaintsList = document.getElementById('complaints-list');
    complaintsList.innerHTML = '';

    const totalCard = document.querySelector('.result-card.total-complaints');
    const rankingCard = document.querySelector('.result-card.ranking');
    const complaintsHeading = document.querySelector('.complaints-by-type h3');

    if (result.mode === 'neighborhood') {
      totalCard.style.display = 'none';
      rankingCard.style.display = 'none';
      complaintsHeading.textContent = 'Zip Codes in This Neighborhood';

      result.zipResults.forEach(zipResult => {
        complaintsList.appendChild(this.createZipResultCard(zipResult, true));
      });
      return;
    }

    totalCard.style.display = '';
    rankingCard.style.display = '';
    complaintsHeading.textContent = 'Complaints by Type';

    document.getElementById('total-complaints').textContent = result.totalComplaints.toLocaleString();
    document.getElementById('ranking-value').textContent = `#${result.rank} of ${result.rankingTotal}`;
    document.getElementById('ranking-detail').textContent = result.rankDetail;

    complaintsList.appendChild(this.createSectionBreakdown(result.sectionData, result.totalComplaints));
  }

  /**
   * Creates a zip-code result card
   */
  createZipResultCard(zipResult, isNested = false) {
    const card = document.createElement('div');
    card.className = `zip-result-card${isNested ? ' zip-result-card--nested' : ''}`;

    const summary = document.createElement('div');
    summary.className = 'zip-result-summary';
    summary.innerHTML = `
      <div>
        <div class="zip-result-kicker">Zip Code</div>
        <h4 class="zip-result-title">${zipResult.title}</h4>
        <div class="zip-result-subtitle">${zipResult.subtitle}</div>
      </div>
      <div class="zip-result-meta">
        <div class="zip-result-total">${zipResult.totalComplaints.toLocaleString()}</div>
        <div class="zip-result-meta-label">Total Complaints</div>
        <div class="zip-result-meta-rank">${zipResult.rankDetail}</div>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'zip-result-sections';
    zipResult.sectionData.forEach(section => {
      const sectionEl = this.createSectionCard(section, zipResult.totalComplaints);
      list.appendChild(sectionEl);
    });

    card.appendChild(summary);
    card.appendChild(list);
    return card;
  }

  /**
   * Creates a complaint section card
   */
  createSectionCard(section, totalComplaints) {
    const item = document.createElement('div');
    item.className = 'complaint-section-card';

    if (!section.grouped) {
      if (section.hasData) {
        const percentage = ((section.total / totalComplaints) * 100).toFixed(1);
        item.innerHTML = `
          <div class="complaint-section-header">
            <span class="complaint-section-title">${section.label}</span>
            <span class="complaint-section-total">${section.total} complaints (${percentage}%)</span>
          </div>
          <div class="complaint-type-bar">
            <div class="complaint-type-bar-fill" style="width: ${percentage}%"></div>
          </div>
        `;
      } else {
        item.innerHTML = `
          <div class="complaint-section-header">
            <span class="complaint-section-title">${section.label}</span>
            <span class="complaint-section-total no-data">Data Not Available</span>
          </div>
          <div class="complaint-type-bar">
            <div class="complaint-type-bar-fill" style="width: 0%"></div>
          </div>
        `;
        item.classList.add('no-data-item');
      }
    } else {
      const totalLabel = section.hasData
        ? `${section.total} complaints`
        : 'Data Not Available';

      const subitemsHtml = section.subitems.map(subitem => `
        <div class="complaint-subitem ${subitem.hasData ? '' : 'no-data'}">
          <span class="complaint-subitem-label">${subitem.label}</span>
          <span class="complaint-subitem-value">${subitem.hasData ? `${subitem.count} complaints` : 'Data Not Available'}</span>
        </div>
      `).join('');

      item.innerHTML = `
        <div class="complaint-section-header">
          <span class="complaint-section-title">${section.label}</span>
          <span class="complaint-section-total ${section.hasData ? '' : 'no-data'}">${totalLabel}</span>
        </div>
        <div class="complaint-subitems">
          ${subitemsHtml}
        </div>
      `;

      if (!section.hasData) {
        item.classList.add('no-data-item');
      }
    }

    return item;
  }

  /**
   * Creates the default section breakdown for a single zip search
   */
  createSectionBreakdown(sectionData, totalComplaints) {
    const wrapper = document.createElement('div');
    sectionData.forEach(section => {
      wrapper.appendChild(this.createSectionCard(section, totalComplaints));
    });
    return wrapper;
  }

  /**
   * Resets the search form
   */
  resetSearch() {
    document.getElementById('zip-code-input').value = '';
    document.getElementById('zip-code-input').focus();
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('no-results-section').style.display = 'none';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZipCodeComparison };
}
