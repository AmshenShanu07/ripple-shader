uniform vec3 uMousePos;
uniform float uPrograss;
uniform float uIsProgress;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec3 vPos;


vec3 hash( vec3 p ) {
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
            dot(p,vec3(269.5,183.3,246.1)),
            dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}


float noise(in vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);

  vec3 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(
        dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)), 
        dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x), 
      mix(
        dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)), 
        dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y), 
      mix(
        mix(
          dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)), 
          dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x), 
          mix(dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)), 
          dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
}

void main () {
  vec3 color1 = vec3(1.0, 1.0, 1.0);
  vec3 color2 = vec3(0.4549, 0.4549, 0.4549);

  // Loaded image texture into variable
  vec3 color = texture2D(uTexture,vUv).rgb;
  
  // Calculating distance from mouse entered point to get circular pattern 
  float dist = distance(vPos,uMousePos);
  dist += noise(vPos);  // adding noice funtion ofor

  float ringSize = 0.1;

  // implemeting expand animation
  float radi = 1.0 - abs((uPrograss - 0.5) * 5.0);
  radi = 0.5 * uPrograss * 5.0;
  radi = pow(radi, 1.21);

  // calculating circle and getting difference for getting ring pattern
  float ring = smoothstep(radi + ringSize,radi,dist);
  ring -= smoothstep(radi,radi - ringSize,dist);

  // adding colors based on calculated stuffs
  vec3 ringColor = mix(color2,color1,smoothstep(0.5, 0.9,ring));
  ringColor = mix(color,ringColor,1.0 - uPrograss);

  // making sure there is no trace of rings after animation is over
  color = mix(color,ringColor,ring * uIsProgress);


  gl_FragColor = vec4(color, 1.0);
}