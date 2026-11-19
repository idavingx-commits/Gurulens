const redirectToApex = {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "gurulens.us";
    url.port = "";
    return Response.redirect(url.toString(), 308);
  },
};

export default redirectToApex;
