mkdir -p package
pip install --target ./package -r requirements.txt
cd package
zip -r ../deployment.zip .
cd ..
zip deployment.zip main.py 