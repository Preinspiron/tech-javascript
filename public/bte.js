// console.log('DEVMODE', import.meta.env);

function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name) || '';
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

window.btq = function (
  pixel,
  eventName,
  serverUrl = 'https://tech-javascript.onrender.com/',
) {
  const payload = {
    pixel_id: pixel,
    fbclid: getUrlParameter('fbclid'),
    event_name: eventName,
    event_source_url: window.location.href,
    client_ip_address: '',
    client_user_agent: navigator.userAgent,
    sub_id:
      getUrlParameter('subid') ||
      getUrlParameter('_subid') ||
      getCookie('subid') ||
      getCookie('_subid') ||
      '',
    test_event_code: getUrlParameter('testCode') || '',
  };

  fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) throw new Error('Network response was not ok');
      console.log('Event sent successfully');
    })
    .catch((error) => console.error('Error sending event:', error));
  return 'Event sent successfully';
};

window.addEventListener('load', () => {
  //   window.btq('123456789', 'PageView');
});
