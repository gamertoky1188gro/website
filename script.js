function playNextVideo() {
    const player = document.getElementById('nasheed-player');
    const loadingAnimation = document.getElementById('loading-animation');
    
    // Show loading animation while the video is loading
    loadingAnimation.style.display = 'block';
    player.style.display = 'none';
    
    // Set the video source to stream from the server
    player.src = `https://cdn.discordapp.com/attachments/1291004292014276648/1292762916889821218/Simple_Browser_-_website_-_Visual_Studio_Code_2024-10-04_20-40-08.mp4?ex=6704eac9&is=67039949&hm=9de562c5639415610523108019850975073d74f3af29f5c91c985c47a6208927&`;
  
    // Add event listeners to handle the video loading and errors
    player.addEventListener('canplay', () => {
      console.log('Video can play, hiding loading animation');
      loadingAnimation.style.display = 'none'; // Hide loading animation
      player.style.display = 'block';          // Show the video player
      player.play();                           // Start playing the video
    });
  
    // Handle the video ended event
    player.addEventListener('ended', () => {
      console.log('Video ended, playing the next one');
      playNextVideo(); // Recursively load and play the next video
    });
  
    // Handle video load errors
    player.addEventListener('error', () => {
      console.error('Error loading video, retrying...');
      retryVideoLoading(player, loadingAnimation); // Retry logic
    });
  }
  
  // Retry function in case the video fails to load
  function retryVideoLoading(player, loadingAnimation) {
    // Retry after a delay of 2 seconds
    setTimeout(() => {
      console.log('Retrying video load...');
      loadingAnimation.style.display = 'block';
      player.load();  // Reload the video
    }, 2000);
  }
  
  // Start the video playback on page load
  window.onload = playNextVideo;
  