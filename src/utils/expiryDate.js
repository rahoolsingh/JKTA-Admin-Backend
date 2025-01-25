function expiryDate(mongoTimestamp, year = 1) {
    // Convert MongoDB timestamp to a JavaScript Date object
    const date = new Date(mongoTimestamp);

    // Convert to IST (Indian Standard Time) which is GMT+5:30
    const istOffset = 5 * 60 + 30; // IST offset in minutes
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + istOffset * 60000);

    // Add one year to the IST date for expiry
    const expiryDate = new Date(istTime);
    expiryDate.setFullYear(expiryDate.getFullYear() + year);

    // Format the date to DD-MM-YYYY
    const formattedDate =
        String(expiryDate.getDate()).padStart(2, "0") +
        "-" +
        String(expiryDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        expiryDate.getFullYear();

    return formattedDate;
}

export default expiryDate;
