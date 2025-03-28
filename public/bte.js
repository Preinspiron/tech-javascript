function btq(pixel, eventName) {
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
  };

  const serverUrl = 'https://tech-javascript.onrender.com/';
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
}

document.addEventListener('DOMContentLoaded', () => {
  function btq(pixel, eventName) {
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
        '',
    };

    const serverUrl = 'https://your-server.com/event';
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
  }

  document.addEventListener('DOMContentLoaded', () => {
    btq('123456789', 'PageView');
  });
  '123456789', 'PageView';
});
