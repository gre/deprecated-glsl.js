for format in webm mp4 ogv; do
  rm hammock.$format
  wget http://studio.html5rocks.com/samples/video-player/hammock.$format
done
