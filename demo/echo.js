onmessage = (event) => {
    if (event.data.type !== 'exec') return;

    onmessage = null;
    const status = main(event.data.args||[]);
    postMessage({'type': 'completed', 'status': status});
}

/**
 * @param {string[]} args
 * @returns {number}
 */
function main(args) {
    console.log('echo.js', args);
    for (let i = 1; i < 102784; i++) {
        console.log(i);
    }
    return 0;
}
