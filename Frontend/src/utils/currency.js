// Menu prices are stored in the project's original base units and converted
// to Nepalese Rupees (NPR) for display, matching the backend checkout rate.
export const NPR_RATE = 128;

const nprFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export const formatNPR = (amount) => {
    const value = Number(amount) || 0;
    return `Rs ${nprFormatter.format(value * NPR_RATE)}`;
};
