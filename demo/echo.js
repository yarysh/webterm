onmessage = (event) => {
    if (event.data.type !== 'exec') return;

    onmessage = null;

    const stdIOs = event.data.stdIOs;

    const status = main(stdIOs, event.data.args||[]);
    postMessage({'type': 'completed', 'status': status});
}

/**
 * @param {string[]} args
 * @param {StdIOs} stdIOs
 * @returns {number}
 */
function main(stdIOs, args) {
    console.log('echo.js', args);
    for (let i = 1; i < 102784; i++) {
        stdIOs[1].write(i.toString() + '\n');
        console.log(i);
    }
    return 0;
}
