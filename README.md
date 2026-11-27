# SplitMate — Smart Bill & Expense Splitter

A responsive, browser-based app for splitting restaurant bills and shared expenses fairly. Add people, enter individual items, choose who shared each item, and calculate everyone's final share — including tax and tip.

## Features

- Add and remove people from a group.
- Add individual expenses and assign each item to one or more people.
- Split a shared item equally among the people selected for that item.
- Add tax/GST and tip percentages; both are allocated proportionally to each person's item subtotal.
- See each person's subtotal, tax, tip, and final amount update instantly.
- Copy a shareable text breakdown or download the result as CSV.
- Load a sample bill to try the app immediately.
- Responsive layout for desktop, tablet, and mobile.
- No account, backend, database, or third-party JavaScript dependencies.

## Tech stack

- **HTML5** for semantic page structure and forms
- **CSS3** for responsive layouts with Grid and Flexbox
- **Vanilla JavaScript** for dynamic UI and bill calculations
- **Node.js built-in assert** for calculation tests (no test packages required)

## Run locally

This is a static website. You do not need to install dependencies to use it.

1. Download or clone this repository.
2. Open `index.html` in a browser.

For a local development server, you can use the VS Code **Live Server** extension, or run:

```bash
npx serve .
```

Then open the local URL shown in your terminal.

## Run the calculation tests

Node.js 18 or later is recommended.

```bash
npm test
```

The tests cover exact rupee-to-paise parsing, equal splits with leftover paise, large safe-integer allocations, tax and tip allocation, different item assignments, and unassigned expenses. GitHub Actions runs the same test suite on pushes to `main` and pull requests.

## How to use

1. Add everyone who is part of the group.
2. Enter an item name and its amount in rupees.
3. Select the people who shared that item. Its cost is split equally between the selected people.
4. Repeat for each item on the bill.
5. Enter the tax/GST and tip percentages. Leave either at `0` if it does not apply.
6. Review each person's final share, then copy the breakdown or download the CSV.

Use **Try a sample bill** to load a small example and see the calculations in action.

## Calculation rules

- All amounts are stored as integer paise, not floating-point rupees.
- An item is split equally among its selected people.
- Tax and tip are each calculated from the assigned item subtotal.
- Each person's tax and tip are allocated in proportion to that person's item subtotal.
- Any paise left over during a split is assigned using the largest-remainder method. This ensures the individual shares add up exactly to the displayed subtotal, tax, tip, and final bill total.
- If an item has no currently assigned group member, it is flagged and excluded from the calculated total until it is removed and added again with a valid assignment.

## Project structure

```text
smart-bill-expense-splitter/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── calculator.js
├── tests/
│   └── calculator.test.js
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

## Deploy with GitHub Pages

1. Push this project to a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Once GitHub Pages finishes publishing, open the URL shown in the Pages section.

No build command is required because the app uses plain HTML, CSS, and JavaScript.

## Future improvements

- Support for splitting an item by custom amounts or percentages.
- Multiple currencies and currency selection.
- Save and restore bills locally.
- Add a settlement view showing who should pay whom.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
