# Getting your computer ready for Quint Control

Do Part 1 before phase 1 starts. Part 2 is how you install Quint each time a new phase is ready. It takes about 30 minutes the first time, and you only need your Windows computer and your Lucid login.

Times are UK time. The US market opens at 14:30 UK (9:30 New York) for most of the year; for a week or two in March and in late October/early November the clocks change on different dates and it's 13:30 UK.

---

## Part 1: NinjaTrader and your Lucid account

### Step 1. Install NinjaTrader 8

1. On your Windows computer, go to **ninjatrader.com** and download **NinjaTrader Desktop** (NinjaTrader 8).
2. Run the installer and accept the defaults.
3. Open NinjaTrader and sign in with your NinjaTrader account (create a free one if you don't have one).
4. Check the version: in the main window (the **Control Center**), click **Help > About**. It must say **8.1** or later. If it's older, download the latest installer and run it again.

You should see: the Control Center, a long window with a menu bar (**New, Tools, Connections, Workspaces, Help**) and tabs along the bottom (**Orders, Executions, Strategies, Positions, Accounts, Log**).

### Step 2. Turn on multi-provider mode

This lets NinjaTrader keep several connections open at once, so Quint can trade all your Lucid accounts together.

1. In the Control Center, click **Tools > Options**.
2. Click **General** on the left.
3. Tick **Multi-provider**.
4. Click **OK**, then close NinjaTrader completely and open it again. The setting only works after a restart.

### Step 3. Sign in to Tradovate once with your Lucid login

Lucid accounts run on Tradovate, and NinjaTrader connects to them through Tradovate. Lucid's own setup guide says to "use credentials from Email or Dashboard to Login to Tradovate" before using any other platform ([summary of Lucid's guide](https://bestprops.com/lucid-trading-platforms-setup/)). Guides that have tested this say NinjaTrader refuses correct details until you've done it ([Affordable Indicators](https://affordableindicators.com/ninjatrader-help/connect-lucid-trading-to-ninjatrader-tradovate/)).

1. Open your Lucid dashboard (or the welcome email) and **copy** your Tradovate username and password. Copy and paste them rather than typing, to avoid typos.
2. On the computer, go to **trader.tradovate.com** and sign in with them.
3. If it asks you to pick a trading mode, choose **Simulation** (Lucid's evaluation and funded accounts both run there).
4. Accept the agreements it shows, including the **CME market data** questions. Answer them as a private (non-professional) trader. This is a one-time step.
5. Check you can see your LucidDaily account in Tradovate, then sign out.

### Step 4. Add your Lucid account to NinjaTrader

1. In the Control Center, click **Connections > Configure**.
2. In the **Available** list on the left, click **NinjaTrader**, then **Add**. (There's no "Lucid" or "Tradovate" in the list: the **NinjaTrader** connection type is the Tradovate route.)
3. On the right, fill in:
   - **Connection name**: `Lucid 1` (if you have more Lucid logins later, add one connection each: `Lucid 2`, `Lucid 3`)
   - **User name** and **Password**: your Lucid Tradovate details (paste them)
   - **Account type**: **Simulation**. Not Live, even for a funded account; with Live, NinjaTrader says it found no accounts.
   - **Connect on start-up**: tick it if you want it to connect by itself
4. Click **Apply**, then **OK**.
5. Click **Connections** again and choose **Lucid 1**.

You should see: the connection light in the bottom-left corner of the Control Center turns **green**. If it's yellow or red, see "If something goes wrong" below.

### Step 5. Check your accounts

1. Click the **Accounts** tab at the bottom of the Control Center.
2. You should see **Sim101** (NinjaTrader's practice account, always there) and your **LucidDaily** account, named the way Lucid names it.
3. Make sure you can tell them apart. Sim101 is NinjaTrader's own practice money; your Lucid account is the one that counts.

### Step 6. Check the MNQ price comes through

1. Click **New > Chart**.
2. Type **MNQ**, choose the front month (for example **MNQ 12-26** in November 2026), pick **1 Minute**, and click **OK**.
3. During market hours you should see candles moving. That price comes from your Lucid connection, and it's the price Quint's bots will use. Nothing here costs Claude or TradingView usage.

Your computer is ready for phase 1.

---

## Part 2: Installing Quint (from phase 1 onwards)

Each phase ends with a pull request on GitHub. Once you've merged it:

### Get the files

1. On the computer, open your repo on GitHub (**charlieaustin1107/Quint**), click the green **Code** button, then **Download ZIP**.
2. Open your Downloads folder, right-click the zip, choose **Extract All**, and extract it to `Documents\Quint`. If a `Documents\Quint` folder is already there from last time, delete it first so old files don't linger.

### Run the installer

1. Open `Documents\Quint\quint-control\install`.
2. Right-click **Install-Quint.ps1** and choose **Run with PowerShell**.
3. If Windows says scripts are blocked, click **Start**, type **PowerShell**, open it, and paste this line (then press Enter):

   ```
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Documents\Quint\quint-control\install\Install-Quint.ps1"
   ```

   If your Documents folder is in OneDrive, change the path to match (for example `$env:USERPROFILE\OneDrive\Documents\Quint\...`).

You should see: a blue **Quint Control installer** heading, a line for each part (engine, bots, dashboard website, firm presets…) saying how many files it copied, and **Next step** at the bottom. The first time it says there was nothing to back up; after that it backs up the old Quint files to `Documents\NinjaTrader 8\quint\backups` before replacing them.

The installer only ever touches Quint's own folders. It never changes your other NinjaScript files, your workspaces, or your Quint settings and journal. Running it twice is fine.

### Compile it in NinjaTrader (the F5 step)

1. In NinjaTrader, click **New > NinjaScript Editor**.
2. Press **F5**. NinjaTrader compiles everything and plays a short sound when it's done.
3. Look at the panel at the bottom of the editor. It should be empty. If it shows errors, copy them exactly and paste them to Claude.

From phase 1 you'll then see **Quint Control** in the Control Center's **New** menu. Clicking it opens the black dashboard in your web browser. The phase's own checklist will tell you what to check next.

### Removing Quint

Right-click `install\Uninstall-Quint.ps1` and choose **Run with PowerShell**, then press **F5** in the NinjaScript Editor. It backs up and removes Quint's NinjaScript files but keeps your settings and journal.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| Connection light yellow or red | Check you did Step 3 (Tradovate sign-in and the CME questions). Re-paste the username and password. Check Account type is **Simulation**. |
| "No accounts were found for this account type" | Account type is set to Live. Change it to **Simulation** in Connections > Configure. |
| Can't add a second Lucid connection | Multi-provider isn't on, or NinjaTrader wasn't restarted after turning it on (Step 2). |
| The installer says it can't find `NinjaTrader 8\bin\Custom` | Open NinjaTrader once so it creates the folder, close it, and run the installer again. |
| Windows blocks the script | Use the PowerShell line in "Run the installer" above. |
| Red errors after pressing F5 | Copy the whole error list exactly and paste it to Claude. Quint never changes other files, so your other indicators and strategies are safe. Running `Uninstall-Quint.ps1` and pressing F5 puts NinjaTrader back how it was. |

Lucid and NinjaTrader change their screens from time to time. If what you see doesn't match these steps, check Lucid's help center and tell Claude what you see, so this guide can be updated.
