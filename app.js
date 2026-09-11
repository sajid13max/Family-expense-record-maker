// =====================================================
// SUPABASE
// =====================================================

const SUPABASE_URL = "https://fyipqogowztaiuyejxqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_fPeK4mtvBWNu8UywTxN7ew_db0tvN6r";

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =====================================================
// GLOBAL STATE
// =====================================================

let currentUser = null;
let currentFamily = null;

let selectedType = "income";

let allTransactions = [];
let familyTransactions = [];


// =====================================================
// ELEMENTS
// =====================================================

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const resendBtn = document.getElementById(
    "resendConfirmationBtn"
);

const authMessage = document.getElementById("authMessage");


// =====================================================
// AUTH UI
// =====================================================

function showLogin() {
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
}

function showApp() {
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    loadTransactions();
    loadFamily();
}


// =====================================================
// CHECK CURRENT USER
// =====================================================

async function checkUser() {
    const { data, error } = await db.auth.getUser();

    if (error) {
        console.error("Auth error:", error);
        showLogin();
        return;
    }

    if (data && data.user) {
        currentUser = data.user;
        showApp();
    } else {
        showLogin();
    }
}


// =====================================================
// LOGIN
// =====================================================

loginBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authMessage.textContent =
            "Enter your email and password.";
        return;
    }

    authMessage.textContent = "Signing in...";

    const { data, error } =
        await db.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        authMessage.textContent = error.message;
        return;
    }

    currentUser = data.user;

    authMessage.textContent = "";

    showApp();
});


// =====================================================
// SIGN UP
// =====================================================

signupBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authMessage.textContent =
            "Enter your email and password.";
        return;
    }

    if (password.length < 6) {
        authMessage.textContent =
            "Password must be at least 6 characters.";
        return;
    }

    authMessage.textContent = "Creating account...";

    const { data, error } =
        await db.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

    if (error) {
        authMessage.textContent = error.message;
        return;
    }

    if (data.session) {
        currentUser = data.user;
        authMessage.textContent =
            "Account created successfully.";
        showApp();
    } else {
        authMessage.textContent =
            "Account created! Please confirm your email, then sign in.";
    }
});


// =====================================================
// RESEND CONFIRMATION
// =====================================================

if (resendBtn) {

    resendBtn.addEventListener("click", async () => {

        const email = emailInput.value.trim();

        if (!email) {
            alert("Enter your email address first.");
            return;
        }

        const { error } = await db.auth.resend({
            type: "signup",
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) {
            alert(error.message);
            return;
        }

        alert(
            "Confirmation email sent. Check your inbox and spam folder."
        );
    });
}


// =====================================================
// LOGOUT
// =====================================================

logoutBtn.addEventListener("click", async () => {

    await db.auth.signOut();

    currentUser = null;
    currentFamily = null;

    allTransactions = [];
    familyTransactions = [];

    showLogin();
});


// =====================================================
// NAVIGATION
// =====================================================

const dashboardTab =
    document.getElementById("dashboardTab");

const familyTab =
    document.getElementById("familyTab");

const dashboardSection =
    document.getElementById("dashboardSection");

const familySection =
    document.getElementById("familySection");


dashboardTab.addEventListener("click", () => {

    dashboardTab.classList.add("active");
    familyTab.classList.remove("active");

    dashboardSection.classList.remove("hidden");
    familySection.classList.add("hidden");
});


familyTab.addEventListener("click", async () => {

    familyTab.classList.add("active");
    dashboardTab.classList.remove("active");

    dashboardSection.classList.add("hidden");
    familySection.classList.remove("hidden");

    await loadFamily();
});


// =====================================================
// PERSONAL TRANSACTION ELEMENTS
// =====================================================

const incomeTypeBtn =
    document.getElementById("incomeTypeBtn");

const expenseTypeBtn =
    document.getElementById("expenseTypeBtn");

const saveTransactionBtn =
    document.getElementById("saveTransactionBtn");

const transactionForm =
    document.getElementById("transactionForm");

const transactionDate =
    document.getElementById("transactionDate");

const monthFilter =
    document.getElementById("monthFilter");


// =====================================================
// DEFAULT DATES
// =====================================================

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

transactionDate.value = getToday();
monthFilter.value = getCurrentMonth();


// =====================================================
// INCOME / EXPENSE SWITCH
// =====================================================

incomeTypeBtn.addEventListener("click", () => {

    selectedType = "income";

    incomeTypeBtn.classList.add("active-income");
    expenseTypeBtn.classList.remove("active-expense");

    saveTransactionBtn.textContent = "Add Income";
});


expenseTypeBtn.addEventListener("click", () => {

    selectedType = "expense";

    expenseTypeBtn.classList.add("active-expense");
    incomeTypeBtn.classList.remove("active-income");

    saveTransactionBtn.textContent = "Add Expense";
});


// =====================================================
// ADD TRANSACTION
// =====================================================

transactionForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser) {
        alert("Please sign in first.");
        return;
    }

    const name =
        document.getElementById("transactionName")
            .value
            .trim();

    const amount =
        Number(
            document.getElementById("amount").value
        );

    const category =
        document.getElementById("category").value;

    const date =
        transactionDate.value;

    const note =
        document.getElementById("note")
            .value
            .trim();

    if (!name) {
        alert("Please enter a name or description.");
        return;
    }

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    saveTransactionBtn.disabled = true;
    saveTransactionBtn.textContent = "Saving...";

    const { error } = await db
        .from("transactions")
        .insert({
            user_id: currentUser.id,
            family_id: currentFamily
                ? currentFamily.id
                : null,
            transaction_date: date,
            type: selectedType,
            name: name,
            amount: amount,
            category: category,
            note: note || null
        });

    saveTransactionBtn.disabled = false;

    saveTransactionBtn.textContent =
        selectedType === "income"
            ? "Add Income"
            : "Add Expense";

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    transactionForm.reset();

    transactionDate.value = getToday();

    await loadTransactions();

    if (currentFamily) {
        await loadFamilyTransactions();
    }
});


// =====================================================
// LOAD PERSONAL TRANSACTIONS
// =====================================================

async function loadTransactions() {

    if (!currentUser) {
        return;
    }

    const { data, error } = await db
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("transaction_date", {
            ascending: false
        });

    if (error) {
        console.error("Transaction loading error:", error);
        return;
    }

    allTransactions = data || [];

    renderTransactions();
}


// =====================================================
// RENDER PERSONAL TRANSACTIONS
// =====================================================

function renderTransactions() {

    const tbody =
        document.getElementById("transactionTableBody");

    const empty =
        document.getElementById("emptyState");

    const searchInput =
        document.getElementById("searchInput");

    const month = monthFilter.value;

    let transactions =
        allTransactions.filter(transaction => {

            if (!month) {
                return true;
            }

            return transaction.transaction_date
                .startsWith(month);
        });


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    if (search) {

        transactions =
            transactions.filter(transaction => {

                const text = [
                    transaction.name,
                    transaction.category,
                    transaction.note || "",
                    transaction.type
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(search);
            });
    }


    let income = 0;
    let expense = 0;

    tbody.innerHTML = "";


    transactions.forEach(transaction => {

        const amount =
            Number(transaction.amount);

        if (transaction.type === "income") {
            income += amount;
        } else {
            expense += amount;
        }


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>${escapeHTML(transaction.transaction_date)}</td>

            <td>
                <span class="${
                    transaction.type === "income"
                        ? "income-text"
                        : "expense-text"
                }">
                    ${
                        transaction.type === "income"
                            ? "Income"
                            : "Expense"
                    }
                </span>
            </td>

            <td>
                ${escapeHTML(transaction.name)}
            </td>

            <td>
                ${escapeHTML(transaction.category || "Other")}
            </td>

            <td class="${
                transaction.type === "income"
                    ? "income-text"
                    : "expense-text"
            }">
                ৳${amount.toFixed(2)}
            </td>

            <td>
                ${escapeHTML(transaction.note || "-")}
            </td>

            <td>
                <button
                    class="delete-btn"
                    onclick="deleteTransaction('${transaction.id}')"
                >
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });


    document.getElementById("totalIncome").textContent =
        "৳" + income.toFixed(2);

    document.getElementById("totalExpense").textContent =
        "৳" + expense.toFixed(2);

    document.getElementById("balance").textContent =
        "৳" + (income - expense).toFixed(2);

    document.getElementById("transactionCount").textContent =
        transactions.length;


    if (transactions.length === 0) {
        empty.classList.remove("hidden");
    } else {
        empty.classList.add("hidden");
    }
}


// =====================================================
// PERSONAL FILTERS
// =====================================================

monthFilter.addEventListener(
    "change",
    renderTransactions
);


document
    .getElementById("searchInput")
    .addEventListener(
        "input",
        renderTransactions
    );


// =====================================================
// DELETE TRANSACTION
// =====================================================

async function deleteTransaction(id) {

    if (!confirm("Delete this transaction?")) {
        return;
    }

    const { error } = await db
        .from("transactions")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    await loadTransactions();

    if (currentFamily) {
        await loadFamilyTransactions();
    }
}


// =====================================================
// FAMILY
// =====================================================

async function loadFamily() {

    if (!currentUser) {
        return;
    }


    // Get current user's family membership
    const { data: membership, error } =
        await db
            .from("family_members")
            .select("family_id")
            .eq("user_id", currentUser.id)
            .limit(1);


    if (error) {
        console.error("Family membership error:", error);

        showFamilyMessage(
            "Could not load family information."
        );

        return;
    }


    if (!membership || membership.length === 0) {

        currentFamily = null;

        document
            .getElementById("noFamily")
            .classList.remove("hidden");

        document
            .getElementById("familyDashboard")
            .classList.add("hidden");

        return;
    }


    const familyId =
        membership[0].family_id;


    // Get family information
    const { data: family, error: familyError } =
        await db
            .from("families")
            .select("*")
            .eq("id", familyId)
            .single();


    if (familyError) {

        console.error(
            "Family loading error:",
            familyError
        );

        showFamilyMessage(
            familyError.message
        );

        return;
    }


    currentFamily = family;


    document
        .getElementById("noFamily")
        .classList.add("hidden");

    document
        .getElementById("familyDashboard")
        .classList.remove("hidden");


    document
        .getElementById("familyTitle")
        .textContent =
        family.name;


    document
        .getElementById("displayFamilyName")
        .textContent =
        family.name;


    document
        .getElementById("displayFamilyCode")
        .textContent =
        family.invite_code;


    await loadFamilyTransactions();
}


// =====================================================
// CREATE FAMILY
// =====================================================

document
    .getElementById("createFamilyBtn")
    .addEventListener("click", async () => {

        if (!currentUser) {
            showFamilyMessage("Please sign in first.");
            return;
        }


        const input =
            document.getElementById("familyNameInput");

        const name =
            input.value.trim();


        if (!name) {
            showFamilyMessage(
                "Enter a family name."
            );
            return;
        }


        const button =
            document.getElementById(
                "createFamilyBtn"
            );

        button.disabled = true;
        button.textContent = "Creating...";


        const { data, error } =
            await db.rpc(
                "create_family",
                {
                    p_name: name
                }
            );


        button.disabled = false;
        button.textContent = "Create Family";


        if (error) {

            console.error(
                "Create family error:",
                error
            );

            showFamilyMessage(
                error.message
            );

            return;
        }


        currentFamily = data;


        input.value = "";


        alert(
            "Family created successfully!\n\n" +
            "Family Code: " +
            data.invite_code
        );


        await loadFamily();

        await loadTransactions();
    });


// =====================================================
// JOIN FAMILY
// =====================================================

document
    .getElementById("joinFamilyBtn")
    .addEventListener("click", async () => {

        if (!currentUser) {
            showFamilyMessage(
                "Please sign in first."
            );
            return;
        }


        const input =
            document.getElementById(
                "familyCodeInput"
            );

        const code =
            input.value
                .trim()
                .toUpperCase();


        if (!code) {
            showFamilyMessage(
                "Enter a family code."
            );
            return;
        }


        const button =
            document.getElementById(
                "joinFamilyBtn"
            );

        button.disabled = true;
        button.textContent = "Joining...";


        const { data, error } =
            await db.rpc(
                "join_family",
                {
                    p_code: code
                }
            );


        button.disabled = false;
        button.textContent = "Join Family";


        if (error) {

            console.error(
                "Join family error:",
                error
            );

            showFamilyMessage(
                error.message
            );

            return;
        }


        currentFamily = data;

        input.value = "";


        alert(
            "Successfully joined " +
            data.name
        );


        await loadFamily();

        await loadTransactions();
    });


// =====================================================
// LOAD FAMILY TRANSACTIONS
// =====================================================

async function loadFamilyTransactions() {

    if (!currentFamily) {
        return;
    }


    const { data, error } =
        await db
            .from("transactions")
            .select("*")
            .eq(
                "family_id",
                currentFamily.id
            )
            .order(
                "transaction_date",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Family transaction error:",
            error
        );

        return;
    }


    familyTransactions =
        data || [];


    await renderFamilyReport();
}


// =====================================================
// FAMILY REPORT
// =====================================================

async function renderFamilyReport() {

    if (!currentFamily) {
        return;
    }


    const monthInput =
        document.getElementById(
            "familyMonth"
        );


    if (!monthInput.value) {
        monthInput.value =
            getCurrentMonth();
    }


    const month =
        monthInput.value;


    const transactions =
        familyTransactions.filter(transaction => {

            if (!month) {
                return true;
            }

            return transaction.transaction_date
                .startsWith(month);
        });


    let income = 0;
    let expense = 0;


    transactions.forEach(transaction => {

        const amount =
            Number(transaction.amount);

        if (transaction.type === "income") {
            income += amount;
        } else {
            expense += amount;
        }
    });


    document.getElementById(
        "familyIncome"
    ).textContent =
        "৳" + income.toFixed(2);


    document.getElementById(
        "familyExpense"
    ).textContent =
        "৳" + expense.toFixed(2);


    document.getElementById(
        "familyBalance"
    ).textContent =
        "৳" + (income - expense).toFixed(2);


    await renderMemberSummary(transactions);

    renderCategorySummary(transactions);

    renderFamilyTransactions(transactions);

    await loadMemberCount();
}


// =====================================================
// FAMILY MEMBER SUMMARY
// =====================================================

async function renderMemberSummary(
    transactions
) {

    const { data, error } =
        await db
            .from("family_members")
            .select("user_id")
            .eq(
                "family_id",
                currentFamily.id
            );


    if (error) {

        console.error(
            "Member loading error:",
            error
        );

        return;
    }


    const tbody =
        document.getElementById(
            "memberSummaryBody"
        );

    tbody.innerHTML = "";


    for (const member of data || []) {

        const userId =
            member.user_id;


        const memberTransactions =
            transactions.filter(
                transaction =>
                    transaction.user_id === userId
            );


        let income = 0;
        let expense = 0;


        memberTransactions.forEach(transaction => {

            const amount =
                Number(transaction.amount);

            if (transaction.type === "income") {
                income += amount;
            } else {
                expense += amount;
            }
        });


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                ${escapeHTML(
                    getMemberName(userId)
                )}
            </td>

            <td class="income-text">
                ৳${income.toFixed(2)}
            </td>

            <td class="expense-text">
                ৳${expense.toFixed(2)}
            </td>

            <td>
                ৳${(
                    income - expense
                ).toFixed(2)}
            </td>

            <td>
                ${memberTransactions.length}
            </td>
        `;


        tbody.appendChild(row);
    }
}


// =====================================================
// MEMBER NAME
// =====================================================

function getMemberName(userId) {

    if (
        currentUser &&
        userId === currentUser.id
    ) {
        return "You";
    }

    return "Family Member";
}


// =====================================================
// MEMBER COUNT
// =====================================================

async function loadMemberCount() {

    if (!currentFamily) {
        return;
    }


    const { count, error } =
        await db
            .from("family_members")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq(
                "family_id",
                currentFamily.id
            );


    if (error) {
        console.error(error);
        return;
    }


    document.getElementById(
        "familyMemberCount"
    ).textContent =
        count || 0;
}


// =====================================================
// CATEGORY SUMMARY
// =====================================================

function renderCategorySummary(
    transactions
) {

    const categories = {};


    transactions
        .filter(
            transaction =>
                transaction.type === "expense"
        )
        .forEach(transaction => {

            const category =
                transaction.category ||
                "Other";


            categories[category] =
                (
                    categories[category] || 0
                ) +
                Number(transaction.amount);
        });


    const tbody =
        document.getElementById(
            "categorySummaryBody"
        );

    tbody.innerHTML = "";


    Object.entries(categories)
        .sort(
            (a, b) => b[1] - a[1]
        )
        .forEach(
            ([category, amount]) => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `
                    <td>
                        ${escapeHTML(category)}
                    </td>

                    <td class="expense-text">
                        ৳${amount.toFixed(2)}
                    </td>
                `;


                tbody.appendChild(row);
            }
        );
}


// =====================================================
// FAMILY TRANSACTION TABLE
// =====================================================

function renderFamilyTransactions(
    transactions
) {

    const tbody =
        document.getElementById(
            "familyTransactionsBody"
        );

    tbody.innerHTML = "";


    const searchInput =
        document.getElementById(
            "familySearch"
        );


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    let filtered =
        transactions;


    if (search) {

        filtered =
            transactions.filter(transaction => {

                const text = [
                    transaction.name,
                    transaction.category,
                    transaction.note || "",
                    transaction.type
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(search);
            });
    }


    filtered.forEach(transaction => {

        const row =
            document.createElement("tr");


        const memberName =
            getMemberName(
                transaction.user_id
            );


        row.innerHTML = `
            <td>
                ${escapeHTML(
                    transaction.transaction_date
                )}
            </td>

            <td>
                ${escapeHTML(memberName)}
            </td>

            <td class="${
                transaction.type === "income"
                    ? "income-text"
                    : "expense-text"
            }">
                ${
                    transaction.type === "income"
                        ? "Income"
                        : "Expense"
                }
            </td>

            <td>
                ${escapeHTML(transaction.name)}
            </td>

            <td>
                ${escapeHTML(
                    transaction.category || "Other"
                )}
            </td>

            <td class="${
                transaction.type === "income"
                    ? "income-text"
                    : "expense-text"
            }">
                ৳${Number(
                    transaction.amount
                ).toFixed(2)}
            </td>

            <td>
                ${escapeHTML(
                    transaction.note || "-"
                )}
            </td>
        `;


        tbody.appendChild(row);
    });
}


// =====================================================
// FAMILY MONTH FILTER
// =====================================================

document
    .getElementById("familyMonth")
    .addEventListener(
        "change",
        renderFamilyReport
    );


// =====================================================
// FAMILY SEARCH
// =====================================================

document
    .getElementById("familySearch")
    .addEventListener("input", () => {

        const month =
            document.getElementById(
                "familyMonth"
            ).value;


        const transactions =
            familyTransactions.filter(transaction => {

                if (!month) {
                    return true;
                }

                return transaction.transaction_date
                    .startsWith(month);
            });


        renderFamilyTransactions(
            transactions
        );
    });


// =====================================================
// COPY FAMILY CODE
// =====================================================

document
    .getElementById("copyFamilyCodeBtn")
    .addEventListener("click", async () => {

        if (!currentFamily) {
            return;
        }


        try {

            await navigator.clipboard.writeText(
                currentFamily.invite_code
            );

            alert("Family code copied!");

        } catch (error) {

            alert(
                "Could not copy the code. Code: " +
                currentFamily.invite_code
            );
        }
    });


// =====================================================
// FAMILY EXCEL EXPORT
// =====================================================

document
    .getElementById("familyExcelBtn")
    .addEventListener(
        "click",
        exportFamilyExcel
    );


async function exportFamilyExcel() {

    if (!currentFamily) {
        alert("You are not in a family.");
        return;
    }


    const { data, error } =
        await db
            .from("transactions")
            .select("*")
            .eq(
                "family_id",
                currentFamily.id
            )
            .order(
                "transaction_date",
                {
                    ascending: true
                }
            );


    if (error) {

        alert(error.message);
        return;
    }


    const transactions =
        data || [];


    let totalIncome = 0;
    let totalExpense = 0;


    transactions.forEach(transaction => {

        const amount =
            Number(transaction.amount);


        if (transaction.type === "income") {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }
    });


    // SUMMARY
    const summary = [
        {
            "Family":
                currentFamily.name
        },
        {
            "Family Code":
                currentFamily.invite_code
        },
        {
            "Total Income":
                totalIncome
        },
        {
            "Total Expense":
                totalExpense
        },
        {
            "Balance":
                totalIncome - totalExpense
        },
        {
            "Generated":
                new Date().toLocaleString()
        }
    ];


    // TRANSACTIONS
    const transactionSheet =
        transactions.map(transaction => ({
            Date:
                transaction.transaction_date,

            Member:
                getMemberName(
                    transaction.user_id
                ),

            Type:
                transaction.type,

            Description:
                transaction.name,

            Category:
                transaction.category || "Other",

            Amount:
                Number(transaction.amount),

            Note:
                transaction.note || ""
        }));


    // CATEGORIES
    const categories = {};


    transactions
        .filter(
            transaction =>
                transaction.type === "expense"
        )
        .forEach(transaction => {

            const category =
                transaction.category ||
                "Other";


            categories[category] =
                (
                    categories[category] || 0
                ) +
                Number(transaction.amount);
        });


    const categorySheet =
        Object.entries(categories)
            .map(
                ([category, amount]) => ({
                    Category: category,
                    TotalExpense: amount
                })
            );


    // WORKBOOK
    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summary),
        "Family Summary"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
            transactionSheet
        ),
        "All Transactions"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
            categorySheet
        ),
        "Categories"
    );


    XLSX.writeFile(
        workbook,
        "Family-Financial-Report.xlsx"
    );
}


// =====================================================
// FAMILY MESSAGE
// =====================================================

function showFamilyMessage(message) {

    document.getElementById(
        "familyMessage"
    ).textContent = message;
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================================
// AUTH STATE
// =====================================================

db.auth.onAuthStateChange(
    (event, session) => {

        if (session && session.user) {

            currentUser =
                session.user;

            showApp();

        } else {

            currentUser = null;
            currentFamily = null;

            showLogin();
        }
    }
);


// =====================================================
// START APP
// =====================================================

checkUser();