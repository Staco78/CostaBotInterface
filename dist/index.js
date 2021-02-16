const { QMainWindow, QPushButton, QBoxLayout, QWidget, Direction, QLabel, QTabWidget, QIcon, QTextEdit, QComboBox, QGroupBox, QProgressBar, AlignmentFlag } = require("@nodegui/nodegui");


const config = require("./config.json");

const WebSocket = require("ws");

let ws = new WebSocket("ws://localhost:" + config.interface.port);
console.log("Connection...");
ws.onopen = () => {
    console.log("Authorisation en cours...");
    ws.send(JSON.stringify({ action: "connect", token: config.interface.token }));
}

//variables globales
let logsAll = "";
let logsMessages = "";
let logsCommands = "";
let logsLevels = "";


let win = new QMainWindow();
win.setFixedSize(400, 300);
win.setWindowTitle("CostaBot v" + process.env.npm_package_version);
let centralWidget = new QWidget(win);
win.setCentralWidget(centralWidget);
let layoutAll = new QBoxLayout(Direction.TopToBottom, centralWidget);

//page 1
let page1 = {};
page1.widgetAll = new QWidget();
page1.button = new QPushButton();
page1.label = new QLabel();
page1.label.setText("Bot éteint");
page1.layout = new QBoxLayout(Direction.TopToBottom, page1.widgetAll);
page1.layout.addWidget(page1.button);
page1.layout.addWidget(page1.label);

//page 2
let page2 = {};
page2.widgetAll = new QWidget();
page2.comboBox = new QComboBox()
page2.comboBox.addItem(new QIcon(), "Tous les logs");
page2.comboBox.addItem(new QIcon(), "Seulement les messages envoyés");
page2.comboBox.addItem(new QIcon(), "Seulement les commandes utilisés");
page2.comboBox.addItem(new QIcon(), "Seulement les niveaux passés");
page2.textArea = new QTextEdit();
page2.textArea.setReadOnly(true);
page2.layout = new QBoxLayout(Direction.TopToBottom, page2.widgetAll)
page2.layout.addWidget(page2.comboBox);
page2.layout.addWidget(page2.textArea);

//page 3
let page3 = {};
page3.widgetAll = new QWidget();
page3.groupBox = new QGroupBox(page3.widgetAll);
page3.groupBox.setTitle("Performances");
page3.groupBox.setGeometry(10, 140, 360, 100);
page3.layout_groupBox = new QBoxLayout(Direction.TopToBottom, page3.groupBox);
page3.barre1 = new QProgressBar();
page3.barre1.setFormat("%p%");
page3.barre1.setAlignment(AlignmentFlag.AlignCenter);
page3.barre1.setRange(0, 100);
page3.barre1.setStyleSheet("QProgressBar::chunk { background-color: #06b025 }");

page3.barre2 = new QProgressBar();
page3.barre2.setFormat("%v/%mMo (%p%)");
page3.barre2.setAlignment(AlignmentFlag.AlignCenter);
page3.barre2.setRange(0, 0);
page3.barre2.setStyleSheet("QProgressBar::chunk { background-color: #06b025 }");

page3.labelBarre1 = new QLabel();
page3.labelBarre1.setText("CPU");
page3.labelBarre2 = new QLabel();
page3.labelBarre2.setText("RAM");

page3.barre1.setFixedSize(340, 21);
page3.barre2.setFixedSize(340, 21);

page3.layout_groupBox.addWidget(page3.labelBarre1);
page3.layout_groupBox.addWidget(page3.barre1);
page3.layout_groupBox.addWidget(page3.labelBarre2);
page3.layout_groupBox.addWidget(page3.barre2);
page3.layout_groupBox.setSpacing(0);
page3.layout_groupBox.setContentsMargins(10, 0, 0, 10);

//tab
let tab = new QTabWidget(centralWidget);
tab.addTab(page1.widgetAll, new QIcon(), "Accueil");
tab.addTab(page2.widgetAll, new QIcon(), "Logs");
tab.addTab(page3.widgetAll, new QIcon(), "Info");



layoutAll.addWidget(tab);


// events
page1.button.addEventListener("clicked", () => {
    let send = {
        action: "func"
    }
    if (page1.button.text() == "Start") {
        send.func = "startBot";
        page1.button.setText("Stop");

    }
    else {
        send.func = "stopBot";
        page1.button.setText("Start");

    }
    ws.send(JSON.stringify(send));
});


//message
ws.onmessage = (message) => {
    message = JSON.parse(message.data);
    console.log(message);
    switch (message.action) {
        case "connect":
            console.log("Authorisation reussi");
            if (message.uptime == "null") {
                page1.button.setText("Start");
                page1.label.setText("Bot éteint");
            }
            else {
                page1.button.setText("Stop");
                let startedSince = new Date(Date.now() - message.uptime);
                page1.label.setText("Bot allumé le " + startedSince.toLocaleDateString() + " à " + startedSince.toLocaleTimeString());
            }
            win.show();
            break;
        case "logs":
            message.logs.forEach(m => {
                logsAll += m.data + "\n";
                if (m.type == "message") {
                    logsMessages += m.data + "\n";
                }
                if (m.type == "levels") {
                    logsLevels += m.data + "\n";
                }
                if (m.type == "command") {
                    logsCommands += m.data + "\n";
                }
            });
            page2.textArea_changeText();
            break;
        case "addLog":
            logsAll += message.data + "\n";
            if (message.type == "message") {
                logsMessages += message.data + "\n";
            }
            if (message.type == "levels") {
                logsLevels += message.data + "\n";
            }
            if (message.type == "command") {
                logsCommands += message.data + "\n";
            }
            page2.textArea_changeText();
            break;
        case "refresh":
            page3.barre1.setValue(message.perf.cpu_usage);
            page3.barre2.setRange(0, message.perf.mem.totalMemMb);
            page3.barre2.setValue(message.perf.mem.usedMemMb);
            break;
        default:
            console.log(message);
            break;
    }
};

ws.on("close", (code, reason) => {
    switch (code) {
        case 403:
            console.log("Authorisation echoue !");
            break;
        default:
            console.log(`Ws ferme avec le code ${code} ! Raison: ${reason}`);
    }
});

page2.comboBox.addEventListener("currentTextChanged", () => {
    page2.textArea_changeText();
});

page2.textArea_changeText = () => {
    if (page2.comboBox.currentText() == "Tous les logs") {
        page2.textArea.setText(logsAll);
    }
    else if (page2.comboBox.currentText() == "Seulement les commandes utilisés") {
        page2.textArea.setText(logsCommands);
    }
    else if (page2.comboBox.currentText() == "Seulement les niveaux passés") {
        page2.textArea.setText(logsLevels);
    }
    else if (page2.comboBox.currentText() == "Seulement les messages envoyés") {
        page2.textArea.setText(logsMessages);
    }
}

global.win = win;