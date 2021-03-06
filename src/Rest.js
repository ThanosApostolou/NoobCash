"use strict";

const express = require('express');

/**
 * @class Rest
 */
class Rest {

    /**
     *Creates an instance of Rest.
     * @param {Node} node
     * @memberof Rest
     */
    constructor(node) {
        this.node = node;   // reference to parent object
        this.app = express();
        this.app.use(express.json({ limit: '50mb', extended: true }));

        Object.seal(this);
    }

    /**
     * @memberof Rest
     */
    init() {
        this.app.get('/', (req, res) => {
            //res.send('I am Node' + this.node.id + ". Listening on ip " + this.node.ip + " and port " + this.node.port);
            let html=`
            I am node${this.id}
            <br/>
            <form action="/transaction/" method="get">
                <label for="id">Recipient ID:</label><br>
                <input type="number" id="id" name="id"><br>
                <label for="amount">amount:</label><br>
                <input type="number" id="amount" name="amount">
                <input type="submit" value="Submit">
            </form>
            <br/>

            <br/>
            <a href="/view">View Transactions of Last Block</a>
            <br/>
            <a href="/balance">Show Wallet Balance</a>
            <br/>
            <a href="/help">Show Help</a>
            <br/>
            <a href="/measurements">Show Measurements</a>
            <br/>
            <a href="/debug">Debug</a>
            <br/>
            <a href="/debug/contacts">Debug Contacts</a>
            <br/>
            <a href="/debug/blockchain">Debug Blockchain</a>
            `;
            res.send(html);
        });

        //////// DEBUGGING
        // shows node properties for debugging purposes
        this.app.get('/debug', (req, res) => {
            res.send(this.node.getProperties());
        });
        // shows node.contacts properties for debugging purposes
        this.app.get('/debug/contacts', (req, res) => {
            let contacts = Array.from(this.node.contacts);
            for (let id=0; id<contacts.length; id++) {
                let balance=0;
                for (let j=0; j<contacts[id].UTXO.length; j++) {
                    balance += contacts[id].UTXO[j].amount;
                }
                contacts[id].balance = balance;
            }
            res.send(contacts);
        });
        // shows node.blockchain properties for debugging purposes
        this.app.get('/debug/blockchain', (req, res) => {
            res.send(this.node.getProperties().blockchain);
        });
        ////////////////

        //////// CLIENT
        // does a transaction with amount to node with id
        this.app.get('/transaction', (req, res) => {
            let id = parseInt(req.query.id);
            let receiver_address = this.node.contacts[id].publickey;
            let amount = parseInt(req.query.amount);
            res.send("I am node" + this.node.id + ". Doing transaction to " + id + " with amount " + amount);
            this.node.create_transaction(receiver_address, amount);
        });
        // view last transactions
        this.app.get('/view', (req, res) => {
            let last_transactions = Object.assign({}, this.node.view_last_transactions());
            res.send(last_transactions);
        });
        // show balance
        this.app.get('/balance', (req, res) => {
            let balance_info = {
                balance:    this.node.show_balance()
            };
            res.send(balance_info);
        });
        // show help
        this.app.get('/help', (req, res) => {
            let html = `
            /transaction/<recipient_address>:<amount><br/>
            New transaction: ???????????? ?????? recipient_address wallet ???? ???????? amount ?????? NBC coins ?????? ???? ?????????? ??????
            ???? wallet sender_address. ???? ?????????? ?????????????????? create_transaction ?????? backend ?????? ????
            ???????????????? ?????? ???????????????? ????????????????????.<br/><br/>

            /view/<br/>
            View last transactions: ???????????? ???? transactions ?????? ?????????????????????? ?????? ?????????????????? ?????????????????????? block ??????
            noobcash blockchain. ?????????? ???? ?????????????????? view_transactions() ?????? backend ?????? ???????????????? ??????
            ???????????????? ????????????????????.<br/><br/>

            /balance/<br/>
            Show balance: ???????????? ???? ???????????????? ?????? wallet.<br/><br/>

            /help/<br/>
            ?????????????????? ?????? ???????????????? ??????????????.
            `;
            res.send(html);
        });
        // show measurements
        this.app.get('/measurements', (req, res) => {
            let throughput = this.node.count_created_transactions/this.node.transactions_time;
            let total_block_time = 0;
            this.node.block_times.forEach(block_time => {
                total_block_time += block_time;
            });
            // mean block_time
            let block_time = total_block_time / this.node.block_times.length;
            let measurements_info = {
                count_created_transactions: this.node.count_created_transactions,
                count_executed_transactions: this.node.count_executed_transactions,
                start_time: this.node.start_time,
                finish_time: this.node.finish_time,
                transactions_time: this.node.transactions_time,
                block_times: this.node.block_times,
                throughput: throughput,
                block_time: block_time
            };
            res.send(measurements_info);
        });
        ////////////////

        // gets activated when all nodes have been created
        this.app.post('/backend/receivecontacts', (req, res) => {
            res.send('I am Node' + this.node.id + ". Received contacts");
            console.log('I am Node' + this.node.id + ". Received contacts");
            this.node.action_receivecontacts(req.body.contacts);
        });
        // gets activated when all nodes have been created
        this.app.post('/backend/receiveblockchain', (req, res) => {
            res.send('I am Node' + this.node.id + ". Received Blockchain");
            console.log('I am Node' + this.node.id + ". Received Blockchain");
            this.node.action_receiveblockchain(req.body.blockchain);
        });
        // gets activated when a transaction is broadcasted
        this.app.post('/backend/receivetransaction', (req, res) => {
            this.node.action_receivetransction(req.body.transaction).then(() => {
                res.send('I am Node' + this.node.id + ". Received Transaction");
            });
        });
        // gets activated when a block is broadcasted
        this.app.post('/backend/receiveblock', (req, res) => {
            res.send('I am Node' + this.node.id + ". Received Block");
            this.node.action_receiveblock(req.body.block);
        });
        // gets activated when a block is broadcasted
        this.app.post('/backend/askedblockchain', (req, res) => {
            res.send(this.node.blockchain.getProperties());
        });
        // broadcasted transaction ended
        this.app.post('/backend/transactionended', (req, res) => {
            res.send('I am Node' + this.node.id + ". Transaction ended");
            this.node.action_transactionended();
        });
        // gets activated when a block is broadcasted
        this.app.post('/backend/readfile', (req, res) => {
            res.send("read file");
            this.node.read_file();
        });


        // start logic when rest is ready
        this.app.listen(this.node.port, this.node.sendContact());
    }
}

module.exports = Rest;