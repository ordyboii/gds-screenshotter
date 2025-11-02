# GDS Screenshotter

This project automates the process of capturing screenshots for a GOV.UK journey. It navigates through dynamic pages, fills in dummy data, and captures screenshots of each step in the journey. The screenshots are then archived into a zip file for easy sharing and storage.

## Features

- automates navigation through GOV.UK journeys.
- captures screenshots of each step in the journey.
- handles dynamic pages with multiple `<h1>` elements or missing "Continue" buttons.
- fills in dummy data for forms, including text, email, number, radio buttons, and checkboxes.
- archives screenshots into a zip file.

## Prerequisites

- Node.js (v16 or higher)
- Playwright (npx playwright install)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gds-screenshotter
   ```

2. Install dependencies:
   ```bash
   npm install
   npx playwright install
   ```

## Usage

1. Run the script with the starting URL of the journey:
   ```bash
   npm start <starting-url>
   ```

2. The script will:
   - navigate through the journey.
   - capture screenshots of each step.
   - archive the screenshots into `govuk-journey.zip`.

3. The screenshots will also be saved in the `screenshots` directory.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
