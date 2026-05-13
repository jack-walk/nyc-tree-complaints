/**
 * Zip Code Comparison Tool Component
 * Allows users to search zip codes and view complaint statistics
 */

class ZipCodeComparison {
  constructor(config) {
    this.dataFile = config.dataFile || 'data/complaints_all_zip_codes copy.csv';
    this.containerSelector = config.containerSelector || '#zip-comparison-root';
    this.data = [];
    this.processedData = {}; // Organized by zip code
    this.zipCodeRankings = []; // Ranked zip codes
    this.loadData();
  }

  /**
   * Loads and parses CSV data
   */
  loadData() {
    fetch(this.dataFile)
      .then(response => response.text())
      .then(text => {
        this.parseCSV(text);
        this.processData();
        this.render();
      })
      .catch(error => console.error('Error loading data:', error));
  }

  /**
   * Parses CSV text into an array of objects
   */
  parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      this.data.push(obj);
    }
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
   * Processes raw data into organized structure
   */
  processData() {
    // Initialize zip code data
    this.data.forEach(row => {
      const zipCode = row['Incident Zip'];
      const problemType = row['Problem Detail (formerly Descriptor)'];
      const count = parseInt(row['count_descriptor']) || 0;

      if (!this.processedData[zipCode]) {
        this.processedData[zipCode] = {
          zipCode: zipCode,
          totalComplaints: 0,
          complaintsByType: {}
        };
      }

      this.processedData[zipCode].totalComplaints += count;
      
      if (!this.processedData[zipCode].complaintsByType[problemType]) {
        this.processedData[zipCode].complaintsByType[problemType] = 0;
      }
      this.processedData[zipCode].complaintsByType[problemType] += count;
    });

    // Create rankings based on total complaints
    this.zipCodeRankings = Object.values(this.processedData)
      .sort((a, b) => b.totalComplaints - a.totalComplaints)
      .map((item, index) => {
        item.rank = index + 1;
        return item;
      });
  }

  /**
   * Searches for a zip code and returns ranking information
   */
  searchZipCode(zipCode) {
    return this.zipCodeRankings.find(item => item.zipCode === zipCode) || null;
  }

  /**
   * Gets a zip code's rank percentile
   */
  getPercentile(rank) {
    const total = this.zipCodeRankings.length;
    return ((total - rank + 1) / total * 100).toFixed(1);
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
        <h1>Compare Tree Complaints by Zip Code</h1>
        <p>
          Discover how tree complaints in your neighborhood compare to the rest of New York City. 
          Search your zip code to see the total number of complaints, a breakdown by complaint type, 
          and how your area ranks among all NYC zip codes.
        </p>

        <div class="search-section">
          <label for="zip-code-input">Enter Your Zip Code:</label>
          <input 
            type="text" 
            id="zip-code-input" 
            class="zip-code-input" 
            placeholder="e.g., 11203"
            maxlength="5"
          />
          <button id="search-btn" class="search-btn">Search</button>
        </div>

        <div id="results-section" class="results-section" style="display:none;">
          <div class="results-content">
            <h2 id="zip-code-header"></h2>
            
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

            <button id="search-again-btn" class="search-again-btn">Search Another Zip Code</button>
          </div>
        </div>

        <div id="error-section" class="error-section" style="display:none;">
          <p id="error-message"></p>
        </div>

        <div id="no-results-section" class="no-results-section" style="display:none;">
          <p>No data found for this zip code. Please try another.</p>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });

    document.getElementById('zip-code-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    document.getElementById('search-again-btn').addEventListener('click', () => {
      this.resetSearch();
    });
  }

  /**
   * Performs the zip code search
   */
  performSearch() {
    const zipCode = document.getElementById('zip-code-input').value.trim();
    const resultsSection = document.getElementById('results-section');
    const errorSection = document.getElementById('error-section');
    const noResultsSection = document.getElementById('no-results-section');

    // Hide all sections
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    noResultsSection.style.display = 'none';

    // Validate input
    if (!zipCode) {
      document.getElementById('error-message').textContent = 'Please enter a zip code.';
      errorSection.style.display = 'block';
      return;
    }

    if (!/^\d{5}$/.test(zipCode)) {
      document.getElementById('error-message').textContent = 'Please enter a valid 5-digit zip code.';
      errorSection.style.display = 'block';
      return;
    }

    // Search for zip code
    const result = this.searchZipCode(zipCode);

    if (!result) {
      noResultsSection.style.display = 'block';
      return;
    }

    // Display results
    this.displayResults(result);
    resultsSection.style.display = 'block';

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  /**
   * Displays search results
   */
  displayResults(result) {
    // Update header
    document.getElementById('zip-code-header').textContent = `Zip Code ${result.zipCode}`;

    // Update total complaints
    document.getElementById('total-complaints').textContent = result.totalComplaints.toLocaleString();

    // Update ranking
    const total = this.zipCodeRankings.length;
    const percentile = this.getPercentile(result.rank);
    document.getElementById('ranking-value').textContent = `#${result.rank} of ${total}`;
    document.getElementById('ranking-detail').textContent = `Top ${percentile}% in the city`;

    // Sort complaint types by count (descending)
    const sortedTypes = Object.entries(result.complaintsByType)
      .sort((a, b) => b[1] - a[1]);

    // Build complaint types list
    const complaintsList = document.getElementById('complaints-list');
    complaintsList.innerHTML = '';

    sortedTypes.forEach(([type, count]) => {
      const item = document.createElement('div');
      item.className = 'complaint-type-item';
      
      const percentage = ((count / result.totalComplaints) * 100).toFixed(1);
      
      item.innerHTML = `
        <div class="complaint-type-info">
          <span class="complaint-type-name">${type}</span>
          <span class="complaint-type-count">${count} complaints (${percentage}%)</span>
        </div>
        <div class="complaint-type-bar">
          <div class="complaint-type-bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      
      complaintsList.appendChild(item);
    });
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
